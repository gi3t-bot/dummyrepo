"""
Main URL configuration for the project.
All API routes are prefixed with /api/
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import LoginView
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Auth endpoints
    path('api/auth/login/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('api/users/', include('users.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/tasks/', include('tasks.urls')),
    
    # Frontend Routes
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('dashboard/', TemplateView.as_view(template_name='dashboard.html'), name='dashboard'),
    path('projects/', TemplateView.as_view(template_name='projects.html'), name='projects'),
    path('tasks/', TemplateView.as_view(template_name='tasks.html'), name='tasks'),
]
