"""
Views for the projects app.
Implements CRUD with role-based access control.
"""

from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Project
from .serializers import ProjectSerializer


class IsAdminRole(permissions.BasePermission):
    """Custom permission: only users with role='admin' can proceed."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class ProjectListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/projects/ — list projects the user is a member of
    POST /api/projects/ — create a new project (admin only)
    """
    serializer_class = ProjectSerializer

    def get_permissions(self):
        """POST requires admin; GET requires just authentication."""
        if self.request.method == 'POST':
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """
        Filter projects to only those the user belongs to.
        Admins see projects they own; members see projects they're in.
        """
        user = self.request.user
        return Project.objects.filter(Q(owner=user) | Q(members=user)).distinct()


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/projects/<id>/ — view project details
    PUT    /api/projects/<id>/ — update project (admin/owner only)
    DELETE /api/projects/<id>/ — delete project (admin/owner only)
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only access projects they're members of."""
        user = self.request.user
        return Project.objects.filter(Q(owner=user) | Q(members=user)).distinct()

    def check_object_permissions(self, request, obj):
        """Only the project owner can edit or delete."""
        super().check_object_permissions(request, obj)
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if obj.owner != request.user:
                raise PermissionDenied("Only the project owner can modify this project.")
