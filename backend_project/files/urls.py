#files/urls.py
from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    FileViewSet,
    dashboard_stats,
    export_files_report,
    AuditLogViewSet,
    SystemSettingsViewSet,
    file_stats, 
    rejected_files,
    upload_employee_excel,
    list_employees,
    add_employee,
    update_employee,
    delete_employee,
    DTREntryViewSet,
    DTRFileViewSet,
)

router = DefaultRouter()
router.register(r"files", FileViewSet, basename="file")
router.register(r"audit-logs", AuditLogViewSet, basename="auditlog")
router.register(r"settings", SystemSettingsViewSet, basename="systemsettings")
router.register(r"dtr/files", DTRFileViewSet, basename="dtrfile")
router.register(r"dtr/entries", DTREntryViewSet, basename="dtrentry")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard-stats/", dashboard_stats, name="dashboard-stats"),
    path("files-report/", export_files_report, name="files-report"),
    path("file-stats/", file_stats, name="file-stats"),
    path("files/rejected", rejected_files),
    path('upload-employee-excel/', upload_employee_excel, name='upload-employee-excel'),
    path('employees/', list_employees, name='list_employees'),
    path("add-employee/", add_employee, name="add-employee"),
    path('update-employee/<str:employee_code>/', update_employee, name='update-employee'),
    path("delete-employee/<str:employee_code>/", delete_employee, name="delete-employee"),
]
