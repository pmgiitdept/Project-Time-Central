#files/urls.py
from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    FileViewSet,
    dashboard_stats,
    export_files_report,
    AuditLogViewSet,
    SystemSettingsViewSet,
)

router = DefaultRouter()
router.register(r"files", FileViewSet, basename="file")
router.register(r"audit-logs", AuditLogViewSet, basename="auditlog")
router.register(r"settings", SystemSettingsViewSet, basename="systemsettings")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard-stats/", dashboard_stats, name="dashboard-stats"),
    path("files-report/", export_files_report, name="files-report"),
]

