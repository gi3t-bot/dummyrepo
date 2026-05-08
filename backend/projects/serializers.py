"""
projects/serializers.py
project serializer — also handles setting the owner and adding members
"""

from rest_framework import serializers
from .models import Project
from users.serializers import UserSerializer


class ProjectSerializer(serializers.ModelSerializer):
    """
    owner_detail and members_detail are read-only nested fields
    so the frontend gets full user objects instead of just IDs
    the writable fields are still just 'owner' and 'members' (IDs)
    """

    owner_detail = UserSerializer(source='owner', read_only=True)
    members_detail = UserSerializer(source='members', many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description',
            'owner', 'owner_detail',
            'members', 'members_detail',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']

    def create(self, validated_data):
        """set owner to whoever is making the request, then add them as a member too"""
        members = validated_data.pop('members', [])
        project = Project.objects.create(
            owner=self.context['request'].user,
            **validated_data
        )
        if members:
            project.members.set(members)
        # always add the owner as a member
        project.members.add(self.context['request'].user)
        return project
