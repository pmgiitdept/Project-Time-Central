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
        if request.user.role not in ["admin", "viewer"]:
            return Response({"detail": "Forbidden"}, status=403)

        content = []
        file_name = file_obj.file.name.lower()

        try:
            if file_name.endswith(".csv"):
                file_data = file_obj.file.read()
                decoded_data = file_data.decode("utf-8").splitlines()
                reader = csv.reader(decoded_data)
                for row in reader:
                    content.append(row)
            elif file_name.endswith(".xlsx"):
                import openpyxl
                file_bytes = io.BytesIO(file_obj.file.read())
                wb = openpyxl.load_workbook(file_bytes, read_only=True)
                ws = wb.active
                for row in ws.iter_rows(values_only=True):
                    content.append([str(cell) if cell is not None else "" for cell in row])
            else:
                return Response({"detail": "Unsupported file type"}, status=400)
        except Exception as e:
            return Response({"detail": f"Failed to read file: {str(e)}"}, status=400)

        return Response({"content": content})

    @action(detail=True, methods=["patch"], url_path="update-content")
    def update_content(self, request, pk=None):
        file_obj = self.get_object()
        if request.user.role not in ["admin", "viewer"]:
            return Response({"detail": "Forbidden"}, status=403)

        content = request.data.get("content")
        if not content or not isinstance(content, list):
            return Response({"detail": "Invalid content format"}, status=400)

        file_name = file_obj.file.name.lower()
        try:
            if file_name.endswith(".csv"):
                from django.core.files.base import ContentFile
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerows(content)
                file_obj.file.save(file_obj.file.name, ContentFile(output.getvalue()), save=True)

            elif file_name.endswith(".xlsx"):
                from openpyxl import Workbook
                from django.core.files.base import ContentFile
                wb = Workbook()
                ws = wb.active
                for row in content:
                    ws.append(row)
                from io import BytesIO
                stream = BytesIO()
                wb.save(stream)
                file_obj.file.save(file_obj.file.name, ContentFile(stream.getvalue()), save=True)
            else:
                return Response({"detail": "Unsupported file type"}, status=400)
        except Exception as e:
            return Response({"detail": f"Failed to save content: {str(e)}"}, status=400)

        return Response({"detail": "Content updated successfully"})
    
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
    permission_classes = [IsAuthenticated]  # stricter

class SystemSettingsViewSet(viewsets.ModelViewSet):
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [IsAuthenticated]  # stricter
