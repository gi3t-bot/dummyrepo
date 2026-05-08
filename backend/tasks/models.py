"""
tasks/models.py
task belongs to a project and can be assigned to a user
status goes pending -> in_progress -> completed
"""

from django.db import models
from django.conf import settings
from projects.models import Project


class Task(models.Model):
    """
    a unit of work inside a project
    can be assigned to someone or left unassigned
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='tasks',  # project.tasks.all()
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,  # task stays even if the user is deleted
        null=True,
        blank=True,
        related_name='assigned_tasks',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tasks',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
    )
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', '-created_at']  # urgent tasks first

    def __str__(self):
        return f"{self.title} [{self.status}]"
