from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import UserProfile, PasswordResetToken, Category, Transaction, Budget, Notification

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for the UserProfile model."""
    
    class Meta:
        model = UserProfile
        fields = [
            'date_of_birth', 'gender', 'address', 'city', 'state', 'country', 'zip_code',
            'currency', 'monthly_income', 'monthly_budget', 'savings_goal',
            'email_notifications', 'budget_alerts', 'weekly_summary', 'monthly_report',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model."""
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'avatar', 'phone_number', 'auth_provider',
            'is_verified', 'date_joined', 'profile'
        ]
        read_only_fields = ['id', 'email', 'auth_provider', 'is_verified', 'date_joined']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class SignupSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=True, min_length=3, max_length=150)
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=6,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm']
    
    def validate_email(self, value):
        """Check if email is already in use."""
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email
    
    def validate_username(self, value):
        """Check if username is already in use."""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value
    
    def validate_password(self, value):
        """Validate password strength."""
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters long.")
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """Check that both passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        return attrs
    
    def create(self, validated_data):
        """Create a new user."""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password']
        )
        # Create user profile
        UserProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login with email and password."""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_email(self, value):
        return value.lower()


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer for Google OAuth authentication."""
    
    token = serializers.CharField(required=True, help_text="Google ID token")


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing user password."""
    
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=6)
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate_new_password(self, value):
        """Validate new password strength."""
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters long.")
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """Check that new passwords match."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "New passwords do not match."
            })
        return attrs


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    
    profile = UserProfileSerializer(required=False)
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone_number', 'avatar', 'profile']
    
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update profile fields
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        
        return instance


class ForgotPasswordSerializer(serializers.Serializer):
    """Serializer for requesting password reset."""
    
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        email = value.lower()
        if not User.objects.filter(email=email).exists():
            raise serializers.ValidationError("No account found with this email address.")
        return email


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer for resetting password with token."""
    
    token = serializers.UUIDField(required=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=6)
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Passwords do not match."
            })
        
        # Validate token
        try:
            token_obj = PasswordResetToken.objects.get(token=attrs['token'])
            if not token_obj.is_valid():
                raise serializers.ValidationError({
                    'token': "This reset link has expired. Please request a new one."
                })
            attrs['token_obj'] = token_obj
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({
                'token': "Invalid reset token."
            })
        
        return attrs


class SetNewPasswordSerializer(serializers.Serializer):
    """Serializer for setting new password without current password (for forgot password flow)."""
    
    new_password = serializers.CharField(required=True, write_only=True, min_length=6)
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Passwords do not match."
            })
        return attrs


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'type', 'icon', 'color', 'is_default', 'created_at']
        read_only_fields = ['id', 'is_default', 'created_at']


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model."""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'category', 'category_name', 'category_icon', 'category_color',
            'type', 'amount', 'description', 'payment_method', 'payment_method_display',
            'notes', 'date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BudgetSerializer(serializers.ModelSerializer):
    """Serializer for Budget model."""
    
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_color = serializers.CharField(source='category.color', read_only=True, allow_null=True)
    spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, default=0)
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True, default=0)
    status = serializers.CharField(read_only=True, default='normal')  # normal, warning, exceeded
    
    class Meta:
        model = Budget
        fields = [
            'id', 'category', 'category_name', 'category_color', 'amount', 
            'spent', 'percentage', 'status', 'month', 'year', 'is_overall',
            'alert_threshold', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ['id', 'type', 'type_display', 'title', 'message', 'data', 'is_read', 'email_sent', 'created_at', 'time_ago']
        read_only_fields = ['id', 'type', 'title', 'message', 'data', 'email_sent', 'created_at']
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            mins = int(diff.total_seconds() // 60)
            return f"{mins}m ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() // 3600)
            return f"{hours}h ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days}d ago"
        else:
            return obj.created_at.strftime("%b %d")
