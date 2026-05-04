"""Serializers for the tasks app."""

from rest_framework import serializers
from django.utils import timezone
from .models import Task
from users.serializers import UserSerializer


class TaskSerializer(serializers.ModelSerializer):
    """
    Full task serializer.
    assigned_to_detail provides nested user info for display.
    is_overdue is a computed field — no DB column needed.
    """

    assigned_to_detail = UserSerializer(source='assigned_to', read_only=True)
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'project',
            'assigned_to', 'assigned_to_detail',
            'created_by', 'created_by_detail',
            'status', 'due_date', 'is_overdue',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_is_overdue(self, obj):
        """A task is overdue if it has a due date, isn't completed, and the date has passed."""
        if obj.due_date and obj.status != 'completed':
            return obj.due_date < timezone.now().date()
        return False

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        # If user is a member, all fields except 'status' are read-only
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            if request.user.role == 'member':
                for field_name in fields:
                    if field_name != 'status':
                        fields[field_name].read_only = True
        return fields

    def validate(self, attrs):
        project = attrs.get('project')
        assigned_to = attrs.get('assigned_to')
        
        # When updating, project or assigned_to might not be in attrs, so fall back to instance
        if not project and self.instance:
            project = self.instance.project
        if not assigned_to and 'assigned_to' not in attrs and self.instance:
            assigned_to = self.instance.assigned_to

        if project and assigned_to:
            if not project.members.filter(id=assigned_to.id).exists():
                raise serializers.ValidationError({"assigned_to": "Assigned user is not a member of this project."})
        return attrs

    def create(self, validated_data):
        """Auto-set created_by to the requesting user."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
