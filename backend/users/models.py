"""
users/models.py
custom user model, extended django's AbstractUser so i dont have to rewrite all the auth stuff
just added a role field on top
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    two roles: admin and member
    admin can create projects, assign tasks, manage members
    member can only see and update their own tasks
    """

    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]

    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='member',
    )

    # email has to be unique, used for login sometimes
    email = models.EmailField(unique=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_admin(self):
        """quick check instead of doing user.role == 'admin' everywhere"""
        return self.role == 'admin'
