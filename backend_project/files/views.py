#files/views.py
from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import File
from .serializers import FileSerializer, FileStatusSerializer
from accounts.permissions import ReadOnlyForViewer, IsOwnerOrAdmin, CanEditStatus
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse, Http404
from rest_framework.permissions import IsAuthenticated
import csv
from openpyxl import load_workbook
import io

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated, CanEditStatus]

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_parser_classes(self):
        if self.action == "create":
            return [MultiPartParser(), FormParser()]
        return [JSONParser()]

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

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated, ReadOnlyForViewer, IsOwnerOrAdmin])
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
                file_bytes = io.BytesIO(file_obj.file.read())
                wb = load_workbook(filename=file_bytes, read_only=True)
                ws = wb.active
                for row in ws.iter_rows(values_only=True):
                    content.append([str(cell) if cell is not None else "" for cell in row])
            
            else:
                return Response({"detail": "Unsupported file type"}, status=400)
        
        except Exception as e:
            return Response({"detail": f"Failed to read file: {str(e)}"}, status=400)
        
        return Response({"content": content})