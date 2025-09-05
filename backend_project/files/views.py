#files/views.py
from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import File, AuditLog, SystemSettings
from .serializers import FileSerializer, FileStatusSerializer, AuditLogSerializer, SystemSettingsSerializer
from accounts.permissions import ReadOnlyForViewer, IsOwnerOrAdmin, CanEditStatus
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.http import FileResponse, Http404, HttpResponse
from rest_framework.permissions import IsAuthenticated, IsAdminUser
import csv
from openpyxl import load_workbook
import io
from accounts.models import User
from reportlab.pdfgen import canvas
from django.db.models import Count, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
import pytesseract
from PIL import Image
import cv2
import numpy as np
import easyocr

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated, CanEditStatus]

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_parser_classes(self):
        if self.action == "create":
            return [MultiPartParser, FormParser]
        return [JSONParser]

    def get_queryset(self):
        user = self.request.user
        if user.role == "client":
            return File.objects.filter(owner=user)
        return File.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        file_obj = serializer.validated_data['file']

        if user.role == 'client':
            existing_file = File.objects.filter(owner=user, file=file_obj.name).first()
            if existing_file:
                existing_file.file.delete(save=False)
                serializer.instance = existing_file
                serializer.save()
                return

        serializer.save(owner=user)

    @action(
            detail=True, 
            methods=["get"], 
            permission_classes=[IsAuthenticated, ReadOnlyForViewer, IsOwnerOrAdmin]
    )
    def download(self, request, pk=None):
        file = self.get_object()
        try:
            return FileResponse(file.file.open(), as_attachment=True, filename=file.file.name)
        except FileNotFoundError:
            raise Http404

    @action(detail=True, methods=["patch"], url_path="status", parser_classes=[JSONParser])
    def update_status(self, request, pk=None):
        file = self.get_object()
        serializer = FileStatusSerializer(file, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"], url_path="content")
    def get_content(self, request, pk=None):
        file_obj = self.get_object()
        print(f"User: {request.user}, Role: {request.user.role}, File: {file_obj.file.name}")

        if request.user.role not in ["admin", "viewer"]:
            return Response({"detail": "Forbidden"}, status=403)

        # ✅ Always prioritize stored edits
        if file_obj.parsed_content:
            return Response({"pages": file_obj.parsed_content})

        file_name = file_obj.file.name.lower()
        try:
            # --- CSV ---
            if file_name.endswith(".csv"):
                file_obj.file.seek(0)  # reset pointer
                file_data = file_obj.file.read()
                decoded_data = file_data.decode("utf-8").splitlines()
                reader = csv.reader(decoded_data)
                return Response({"pages": [{"page_number": 1, "content": list(reader)}]})

            # --- XLSX ---
            elif file_name.endswith(".xlsx"):
                file_obj.file.seek(0)
                file_bytes = io.BytesIO(file_obj.file.read())
                wb = load_workbook(file_bytes, read_only=True)
                ws = wb.active
                rows = [[str(cell) if cell is not None else "" for cell in row] for row in ws.iter_rows(values_only=True)]
                return Response({"pages": [{"page_number": 1, "content": rows}]})

            # --- PDF ---
            elif file_name.endswith(".pdf"):
                import pdfplumber
                pages_data = []

                def is_number(val):
                    try:
                        float(val)
                        return True
                    except ValueError:
                        return False

                file_obj.file.seek(0)
                with pdfplumber.open(file_obj.file) as pdf:
                    for i, page in enumerate(pdf.pages, start=1):
                        page_data = {"page_number": i}

                        text = page.extract_text()
                        if text:
                            page_data["text"] = text

                        lines = text.splitlines() if text else []
                        structured_table = {"main_headers": [], "sub_headers": [], "rows": []}

                        if lines:
                            header_idx = None
                            for idx, line in enumerate(lines):
                                if "Emp." in line and "DUTY" in line:
                                    header_idx = idx
                                    break

                            if header_idx is not None:
                                structured_table["main_headers"] = [
                                    "Emp. No",
                                    "Name",
                                    "Duty (By Days)",
                                    "Late",
                                    "UT",
                                    "Work (By Hrs)",
                                    "Day-Off (By Hours)",
                                    "SH (By Hrs)",
                                    "LH (By Hrs)",
                                    "Day-Off - SH (By Hrs)",
                                    "Day-Off - LH (By Hrs)"
                                ]
                                structured_table["sub_headers"] = [
                                    [""], [""],
                                    ["WRK", "ABS", "LV", "HOL", "RES"],
                                    [""], [""],
                                    ["REG", "OT", "ND", "OTND"],
                                    ["REG", "OT", "ND", "OTND"],
                                    ["REG", "OT", "ND", "OTND"],
                                    ["REG", "OT", "ND", "OTND"],
                                    ["REG", "OT", "ND", "OTND"],
                                    ["REG", "OT", "ND", "OTND"],
                                ]

                                data_lines = lines[header_idx + 1:]
                                expected_cols = sum(len(group) for group in structured_table["sub_headers"])

                                for dl in data_lines:
                                    parts = dl.split()
                                    if not parts or not parts[0].isdigit():
                                        continue

                                    emp_no = parts[0]
                                    name_parts, numbers = [], []
                                    found_number = False

                                    for p in parts[1:]:
                                        if is_number(p):
                                            found_number = True
                                            numbers.append(f"{float(p):.2f}")
                                        elif not found_number:
                                            name_parts.append(p)

                                    clean_name = " ".join(name_parts).strip()
                                    padded_numbers = numbers + ["0.00"] * (expected_cols - len(numbers))
                                    row = [emp_no, clean_name] + padded_numbers[:expected_cols]
                                    structured_table["rows"].append(row)

                        if structured_table["rows"]:
                            page_data["tables"] = [structured_table]

                        pages_data.append(page_data)

                return Response({"pages": pages_data})

            # --- Images ---
            elif file_name.endswith((".jpg", ".jpeg", ".png")):
                import cv2, numpy as np, easyocr
                file_obj.file.seek(0)
                file_bytes = np.asarray(bytearray(file_obj.file.read()), dtype=np.uint8)
                img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
                if img is None:
                    raise ValueError("Failed to decode image")

                reader = easyocr.Reader(["en"])
                ocr_result = reader.readtext(img)

                rows_dict = {}
                row_threshold = 10
                for (bbox, text, conf) in ocr_result:
                    top = int(bbox[0][1])
                    left = int(bbox[0][0])
                    if not text.strip():
                        continue
                    found = False
                    for key in rows_dict:
                        if abs(key - top) < row_threshold:
                            rows_dict[key].append((left, text))
                            found = True
                            break
                    if not found:
                        rows_dict[top] = [(left, text)]

                table = []
                for top in sorted(rows_dict.keys()):
                    row_words = sorted(rows_dict[top], key=lambda x: x[0])
                    table.append([w[1] for w in row_words])

                return Response({"pages": [{"page_number": 1, "content": table}]})

            else:
                return Response({"detail": "Unsupported file type"}, status=400)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": f"Failed to read file: {str(e)}"}, status=400)

    @action(detail=True, methods=["patch"], url_path="update-content")
    def update_content(self, request, pk=None):
        file_obj = self.get_object()
        if request.user.role not in ["admin", "viewer"]:
            return Response({"detail": "Forbidden"}, status=403)

        pages = request.data.get("pages")
        content = request.data.get("content") 

        if not pages and not content:
            return Response({"detail": "No content provided"}, status=400)

        # --- Flatten pages -> content for CSV/XLSX/images ---
        if pages and not content:
            content = []
            for page in pages:
                if page.get("tables"):
                    for table in page["tables"]:
                        rows = table.get("rows", [])
                        sub_headers = table.get("sub_headers") or []
                        expected_cols = sum(len(group) if isinstance(group, list) else 1 for group in sub_headers)

                        for row in rows:
                            normalized = []
                            for c in range(expected_cols):
                                if c < len(row):
                                    val = row[c]
                                    try:
                                        normalized.append(float(val))
                                    except (ValueError, TypeError):
                                        normalized.append(str(val or "0.00"))
                                else:
                                    normalized.append("0.00")  # fill missing cells
                            content.append(normalized)
                elif page.get("content"): 
                    content.extend(page["content"])

        file_name = file_obj.file.name.lower()

        # --- Helper to format numbers consistently ---
        def format_numeric(val):
            if val is None or val == "":
                return "0.00"
            try:
                num = float(val)
                return f"{num:.2f}"
            except (ValueError, TypeError):
                return str(val)

        try:
            # --- CSV ---
            if file_name.endswith(".csv"):
                from django.core.files.base import ContentFile
                import csv, io
                output = io.StringIO()
                writer = csv.writer(output)
                for row in content:
                    writer.writerow([format_numeric(cell) if isinstance(cell, (int, float, str)) else str(cell) for cell in row])
                file_obj.file.save(file_obj.file.name, ContentFile(output.getvalue()), save=True)

            # --- XLSX ---
            elif file_name.endswith(".xlsx"):
                from openpyxl import Workbook
                from django.core.files.base import ContentFile
                from io import BytesIO

                wb = Workbook()
                ws = wb.active
                for row in content:
                    new_row = []
                    for cell in row:
                        try:
                            new_row.append(float(cell))
                        except (ValueError, TypeError):
                            new_row.append(str(cell or "0.00"))
                    ws.append(new_row)
                stream = BytesIO()
                wb.save(stream)
                file_obj.file.save(file_obj.file.name, ContentFile(stream.getvalue()), save=True)

            # --- PDF ---
            elif file_name.endswith(".pdf"):
                from reportlab.lib.pagesizes import letter
                from reportlab.pdfgen import canvas
                from reportlab.pdfbase.pdfmetrics import stringWidth
                from reportlab.lib.colors import lightgrey, black
                from django.core.files.base import ContentFile
                from io import BytesIO

                buffer = BytesIO()
                p = canvas.Canvas(buffer, pagesize=letter)

                for page in pages:
                    y_offset = 750
                    page_has_content = False

                    # Write text if present
                    if "text" in page and page["text"]:
                        p.setFont("Helvetica", 10)
                        for line in page["text"].splitlines():
                            p.drawString(50, y_offset, line)
                            y_offset -= 15
                            page_has_content = True
                            if y_offset < 50:
                                p.showPage()
                                y_offset = 750
                        p.showPage()

                    # Write tables if present
                    if "tables" in page and page["tables"]:
                        for table in page["tables"]:
                            main_headers = table.get("main_headers", [])
                            sub_headers = table.get("sub_headers", [])
                            rows = table.get("rows", [])

                            flat_sub_headers = []
                            for group in sub_headers:
                                flat_sub_headers.extend(group if isinstance(group, list) else [group])

                            all_rows = [main_headers] + [flat_sub_headers] + rows
                            if not all_rows:
                                continue

                            num_cols = max(len(r) for r in all_rows)
                            col_widths = []
                            row_height = 20

                            for col_idx in range(num_cols):
                                max_width = max(
                                    stringWidth(format_numeric(row[col_idx]) if col_idx < len(row) else "0.00", "Helvetica", 8)
                                    for row in all_rows
                                )
                                col_widths.append(max_width + 20)

                            x_offset, y_start = 50, y_offset

                            # Main headers
                            x = x_offset
                            for j, h in enumerate(main_headers):
                                span = len(sub_headers[j]) if j < len(sub_headers) else 1
                                span_width = sum(col_widths[j:j+span])
                                p.setFillColor(lightgrey)
                                p.rect(x, y_start, span_width, -row_height, fill=1, stroke=1)
                                p.setFillColor(black)
                                p.setFont("Helvetica-Bold", 8)
                                p.drawCentredString(x + span_width / 2, y_start - row_height + 15, h)
                                x += span_width
                            y_start -= row_height

                            # Sub headers
                            x = x_offset
                            for group in sub_headers:
                                for sh in (group if isinstance(group, list) else [group]):
                                    width = col_widths[sub_headers.index(group)]
                                    p.rect(x, y_start, width, -row_height, fill=0, stroke=1)
                                    p.setFont("Helvetica-Bold", 8)
                                    p.drawCentredString(x + width / 2, y_start - row_height + 15, sh)
                                    x += width
                            y_start -= row_height

                            # Table rows
                            for row in rows:
                                if y_start < 50:
                                    p.showPage()
                                    y_start = 750
                                x = x_offset
                                for j in range(num_cols):
                                    text = format_numeric(row[j]) if j < len(row) else "0.00"
                                    p.rect(x, y_start, col_widths[j], -row_height, fill=0, stroke=1)
                                    p.setFont("Helvetica", 8)
                                    p.drawString(x + 2, y_start - row_height + 15, text)
                                    x += col_widths[j]
                                y_start -= row_height

                            y_offset = y_start
                        p.showPage()

                    if not page_has_content:
                        p.setFont("Helvetica", 10)
                        p.drawString(50, 750, "No content available")
                        p.showPage()

                p.save()
                buffer.seek(0)
                file_obj.file.save(file_obj.file.name, ContentFile(buffer.read()), save=True)

            # --- Images ---
            elif file_name.endswith((".jpg", ".jpeg", ".png")):
                import cv2
                import numpy as np
                from django.core.files.base import ContentFile

                rows = content
                cell_width, cell_height = 200, 50
                font, font_scale, thickness = cv2.FONT_HERSHEY_SIMPLEX, 0.7, 1

                n_rows = len(rows)
                n_cols = max(len(r) for r in rows) if rows else 0
                if n_rows == 0 or n_cols == 0:
                    return Response({"detail": "No content to update"}, status=400)

                img_height = n_rows * cell_height + 2
                img_width = n_cols * cell_width + 2
                img = np.ones((img_height, img_width, 3), dtype=np.uint8) * 255

                for i, row in enumerate(rows):
                    for j, cell in enumerate(row):
                        x1, y1 = j * cell_width, i * cell_height
                        x2, y2 = x1 + cell_width, y1 + cell_height
                        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 0), 1)
                        text = str(cell)
                        (tw, th), _ = cv2.getTextSize(text, font, font_scale, thickness)
                        text_x = x1 + (cell_width - tw) // 2
                        text_y = y1 + (cell_height + th) // 2
                        cv2.putText(img, text, (text_x, text_y), font, font_scale, (0, 0, 0), thickness)

                _, buffer = cv2.imencode(".png", img)
                file_obj.file.save(file_obj.file.name, ContentFile(buffer.tobytes()), save=True)

            else:
                return Response({"detail": "Unsupported file type"}, status=400)

            # Save parsed content
            file_obj.parsed_content = pages or content
            file_obj.save(update_fields=["parsed_content"])
            return Response({"detail": "Content updated successfully"})

        except Exception as e:
            return Response({"detail": f"Failed to save content: {str(e)}"}, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    files_pending = File.objects.filter(status="pending").count()
    files_approved = File.objects.filter(status="verified").count()
    active_users = User.objects.filter(is_active=True).count()
    
    return Response({
        "filesPending": files_pending,
        "filesApproved": files_approved,
        "activeUsers": active_users
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_files_report(request):
    format = request.GET.get("format", "csv")
    files = File.objects.all()
    
    if format == "csv":
        response = HttpResponse(content_type="text/csv")
        response['Content-Disposition'] = 'attachment; filename="files_report.csv"'
        writer = csv.writer(response)
        writer.writerow(["ID", "Filename", "Owner", "Status", "Uploaded At"])
        for f in files:
            writer.writerow([f.id, f.file.name, f.owner.username, f.status, f.uploaded_at])
        return response
    
    elif format == "pdf":
        response = HttpResponse(content_type="application/pdf")
        response['Content-Disposition'] = 'attachment; filename="files_report.pdf"'
        p = canvas.Canvas(response)
        y = 800
        p.drawString(50, y, "Files Report")
        y -= 25
        for f in files:
            p.drawString(50, y, f"{f.id} | {f.file.name} | {f.owner.username} | {f.status} | {f.uploaded_at}")
            y -= 20
        p.showPage()
        p.save()
        return response
    
    else:
        return Response({"detail": "Unsupported format"}, status=400)
    
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by("-timestamp")
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]  

class SystemSettingsViewSet(viewsets.ModelViewSet):
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [IsAuthenticated] 

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def file_stats(request):
    period = request.query_params.get("period", "day")  

    if period == "month":
        trunc = TruncMonth("uploaded_at")
    elif period == "week":
        trunc = TruncWeek("uploaded_at")
    else:
        trunc = TruncDay("uploaded_at")

    stats = (
        File.objects
        .annotate(period=trunc)
        .values("period")
        .annotate(
            pending=Count("id", filter=Q(status="pending")),
            verified=Count("id", filter=Q(status="verified")),
        )
        .order_by("period")
    )

    return Response(stats)