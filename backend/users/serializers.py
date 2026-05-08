"""
users/serializers.py
convert user model to/from json
also handles registration validation
"""

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """read only - used when returning user data, never expose the password"""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name']
        read_only_fields = ['id']


class RegisterSerializer(serializers.ModelSerializer):
    """
    for signup
    password2 is just for confirmation, we dont store it
    """

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']

    def validate(self, attrs):
        """check passwords match"""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        """hash the password properly before saving"""
        validated_data.pop('password2')  # dont save this
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)  # this hashes it
        user.save()
        return user
