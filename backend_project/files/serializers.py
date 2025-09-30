# files/serializers.py
from rest_framework import serializers
from .models import File, AuditLog, SystemSettings, EmployeeDirectory, DTRFile, DTREntry

class FileSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = File
        fields = ["id", "owner", "file", "uploaded_at", "updated_at", "status"]

class FileStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ["status"]

class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username", read_only=True)
    role = serializers.ReadOnlyField(source="user.role", read_only=True) 

    class Meta:
        model = AuditLog
        fields = ["id", "user", "role", "action", "status", "ip_address", "timestamp"]

class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = "__all__"

class EmployeeDirectorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDirectory
        fields = "__all__"

    def to_representation(self, instance):
        data = super().to_representation(instance)

        numeric_cols = [
            "total_hours", "nd_reg_hrs", "absences", "tardiness", "undertime",
            "ot_regular", "nd_ot_reg", "ot_restday", "nd_restday", "ot_rest_excess",
            "nd_rest_excess", "ot_special_hday", "nd_special_hday", "ot_shday_excess",
            "nd_shday_excess", "ot_legal_holiday", "special_holiday", "ot_leghol_excess",
            "nd_leghol_excess", "ot_sh_on_rest", "nd_sh_on_rest", "ot_sh_on_rest_excess",
            "nd_sh_on_rest_excess", "leg_h_on_rest_day", "nd_leg_h_on_restday",
            "ot_leg_h_on_rest_excess", "nd_leg_h_on_rest_excess", "vacleave_applied",
            "sickleave_applied", "back_pay_vl", "back_pay_sl", "ot_regular_excess",
            "nd_ot_reg_excess", "legal_holiday", "nd_legal_holiday", "overnight_rate",
        ]

        for key in numeric_cols:
            if data.get(key) is not None:
                try:
                    data[key] = f"{float(data[key]):.2f}"
                except:
                    pass

        return data
    
class DTRFileSerializer(serializers.ModelSerializer):
    filename = serializers.SerializerMethodField()

    class Meta:
        model = DTRFile
        fields = ["id", "uploaded_by", "file", "uploaded_at", "filename"]
        read_only_fields = ["uploaded_by", "uploaded_at"]

    def get_filename(self, obj):
        return obj.file.name.split("/")[-1] if obj.file else None

class DTREntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = DTREntry
        fields = "__all__"
