"""
users/views.py
login, signup, profile stuff
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User
from .serializers import UserSerializer, RegisterSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    extends the default login response to include user info
    the frontend needs the role + username right after login
    so i just added them to the jwt response
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — returns tokens + user info"""
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """POST /api/users/register/ — anyone can register, no auth needed"""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class ProfileView(APIView):
    """GET /api/users/me/ — returns the currently logged in user"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserListView(generics.ListAPIView):
    """GET /api/users/ — list all users (admins use this to assign tasks and add members)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
