"""
projects/models.py
a project has an owner (the admin who created it) and members (everyone with access)
"""

from django.db import models
from django.conf import settings


class Project(models.Model):
    """
    team project
    owner created it, members are everyone who can see it
    owner is always a member too (handled in the serializer)
    """

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_projects',  # user.owned_projects.all()
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='member_projects',  # user.member_projects.all()
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']  # newest first

    def __str__(self):
        return self.name
