"""URL patterns for the tasks app."""

from django.urls import path
from .views import TaskListCreateView, TaskDetailView, DashboardStatsView

app_name = 'tasks'

urlpatterns = [
    path('', TaskListCreateView.as_view(), name='task-list'),            # GET, POST
    path('<int:pk>/', TaskDetailView.as_view(), name='task-detail'),     # GET, PUT, DELETE
    path('dashboard/', DashboardStatsView.as_view(), name='api-dashboard'),  # GET
]
