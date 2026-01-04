from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate, get_user_model
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from google.oauth2 import id_token
from google.auth.transport import requests
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from .serializers import (
    UserSerializer,
    SignupSerializer,
    LoginSerializer,
    GoogleAuthSerializer,
    ChangePasswordSerializer,
    UpdateProfileSerializer,
    UserProfileSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    SetNewPasswordSerializer,
    CategorySerializer,
    TransactionSerializer,
    BudgetSerializer,
    NotificationSerializer,
)
from .models import UserProfile, PasswordResetToken, Category, Transaction, Budget, Notification

User = get_user_model()


def get_tokens_for_user(user):
    """Generate JWT tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class SignupView(generics.CreateAPIView):
    """
    API endpoint for user registration.
    
    POST /api/auth/signup/
    Request body: {email, username, password, password_confirm}
    Returns: User data with JWT tokens
    """
    permission_classes = [AllowAny]
    serializer_class = SignupSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data
        
        return Response({
            'success': True,
            'message': 'Account created successfully!',
            'user': user_data,
            'tokens': tokens,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    API endpoint for user login with email and password.
    
    POST /api/auth/login/
    Request body: {email, password}
    Returns: User data with JWT tokens
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Authenticate user
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            return Response({
                'success': False,
                'message': 'Invalid email or password.',
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({
                'success': False,
                'message': 'Account is disabled. Please contact support.',
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data
        
        return Response({
            'success': True,
            'message': 'Login successful!',
            'user': user_data,
            'tokens': tokens,
        }, status=status.HTTP_200_OK)


class GoogleAuthView(APIView):
    """
    API endpoint for Google OAuth authentication.
    
    POST /api/auth/google/
    Request body: {token} - Google ID token from frontend
    Returns: User data with JWT tokens
    """
    permission_classes = [AllowAny]
    serializer_class = GoogleAuthSerializer
    
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        
        try:
            # Verify the Google ID token
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )
            
            # Get user info from the token
            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')
            picture = idinfo.get('picture', '')
            
            if not email:
                return Response({
                    'success': False,
                    'message': 'Could not get email from Google account.',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user exists
            try:
                user = User.objects.get(email=email)
                # Update user info from Google if logging in
                if user.auth_provider == 'google':
                    user.first_name = first_name or user.first_name
                    user.last_name = last_name or user.last_name
                    user.avatar = picture or user.avatar
                    user.save()
            except User.DoesNotExist:
                # Create new user with Google credentials
                username = email.split('@')[0] + '_' + str(uuid.uuid4())[:8]
                user = User.objects.create_user(
                    email=email,
                    username=username,
                    password=None,  # No password for Google users
                    first_name=first_name,
                    last_name=last_name,
                    avatar=picture,
                    auth_provider='google',
                    is_verified=True,
                )
                # Create user profile
                UserProfile.objects.create(user=user)
            
            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            
            return Response({
                'success': True,
                'message': 'Google authentication successful!',
                'user': user_data,
                'tokens': tokens,
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response({
                'success': False,
                'message': 'Invalid Google token.',
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenRefreshView(APIView):
    """
    Custom token refresh view with better error handling.
    
    POST /api/auth/token/refresh/
    Request body: {refresh} - Refresh token
    Returns: New access token and optionally new refresh token
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response({
                'success': False,
                'message': 'Refresh token is required.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            refresh = RefreshToken(refresh_token)
            
            # Check if user still exists
            user_id = refresh.payload.get('user_id')
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'User no longer exists.',
                    'code': 'user_not_found',
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Generate new tokens
            data = {
                'access': str(refresh.access_token),
            }
            
            # Rotate refresh token if enabled in settings
            if getattr(settings, 'SIMPLE_JWT', {}).get('ROTATE_REFRESH_TOKENS', False):
                refresh.set_jti()
                refresh.set_exp()
                refresh.set_iat()
                data['refresh'] = str(refresh)
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Invalid or expired refresh token.',
                'code': 'token_invalid',
            }, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    """
    API endpoint for user logout.
    
    POST /api/auth/logout/
    Request body: {refresh} - Refresh token to blacklist
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({
                'success': True,
                'message': 'Logout successful!',
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Error during logout.',
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """
    API endpoint for getting and updating user profile.
    
    GET /api/auth/profile/
    Returns: Current user's profile data
    
    PUT/PATCH /api/auth/profile/
    Request body: {first_name, last_name, phone_number, avatar, profile: {currency, monthly_budget, email_notifications}}
    Returns: Updated user profile data
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response({
            'success': True,
            'user': serializer.data,
        }, status=status.HTTP_200_OK)
    
    def put(self, request):
        return self._update_profile(request)
    
    def patch(self, request):
        return self._update_profile(request, partial=True)
    
    def _update_profile(self, request, partial=False):
        user = request.user
        serializer = UpdateProfileSerializer(user, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        user_data = UserSerializer(user).data
        return Response({
            'success': True,
            'message': 'Profile updated successfully!',
            'user': user_data,
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    API endpoint for changing user password.
    
    POST /api/auth/change-password/
    Request body: {old_password, new_password, new_password_confirm}
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Check if user signed up with Google
        if user.auth_provider == 'google' and not user.has_usable_password():
            return Response({
                'success': False,
                'message': 'You signed up with Google and cannot change password here.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check old password
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({
                'success': False,
                'message': 'Current password is incorrect.',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'success': True,
            'message': 'Password changed successfully!',
        }, status=status.HTTP_200_OK)


class DashboardView(APIView):
    """
    Dashboard API endpoint with full financial data.
    Month-aware: Data is filtered by selected month/year, never deleted.
    
    GET /api/dashboard/
    Query params:
    - month: 1-12 (optional, defaults to current month)
    - year: YYYY (optional, defaults to current year)
    
    Returns: Complete dashboard data including stats, transactions, budgets, charts
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        user_data = UserSerializer(user).data
        
        # Get current date info
        today = datetime.now().date()
        
        # Get selected month/year from query params (defaults to current)
        try:
            selected_month = int(request.query_params.get('month', today.month))
            selected_year = int(request.query_params.get('year', today.year))
            # Validate month is 1-12
            if selected_month < 1 or selected_month > 12:
                selected_month = today.month
            # Validate year is reasonable (2020-2030)
            if selected_year < 2020 or selected_year > 2030:
                selected_year = today.year
        except (ValueError, TypeError):
            selected_month = today.month
            selected_year = today.year
        
        # Check if viewing current month
        is_current_month = (selected_month == today.month and selected_year == today.year)
        
        # Calculate previous month for comparison
        if selected_month == 1:
            prev_month = 12
            prev_month_year = selected_year - 1
        else:
            prev_month = selected_month - 1
            prev_month_year = selected_year
        
        # Get all user transactions (for total balance calculation)
        user_transactions = Transaction.objects.filter(user=user)
        
        # Calculate total balance (all income - all expenses across ALL time)
        total_income_all = user_transactions.filter(type='income').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
        total_expenses_all = user_transactions.filter(type='expense').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
        total_balance = total_income_all - total_expenses_all
        
        # Monthly income (selected month)
        monthly_income = user_transactions.filter(
            type='income',
            date__month=selected_month,
            date__year=selected_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Monthly expenses (selected month)
        monthly_expenses = user_transactions.filter(
            type='expense',
            date__month=selected_month,
            date__year=selected_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Calculate savings for selected month
        savings = monthly_income - monthly_expenses
        savings_rate = (savings / monthly_income * 100) if monthly_income > 0 else Decimal('0')
        
        # Previous month stats for comparison
        prev_month_income = user_transactions.filter(
            type='income',
            date__month=prev_month,
            date__year=prev_month_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        prev_month_expenses = user_transactions.filter(
            type='expense',
            date__month=prev_month,
            date__year=prev_month_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Calculate percentage changes vs previous month
        income_change = ((monthly_income - prev_month_income) / prev_month_income * 100) if prev_month_income > 0 else Decimal('0')
        expense_change = ((monthly_expenses - prev_month_expenses) / prev_month_expenses * 100) if prev_month_expenses > 0 else Decimal('0')
        
        # Today's stats (only relevant if viewing current month)
        if is_current_month:
            today_income = user_transactions.filter(
                type='income', date=today
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            today_expenses = user_transactions.filter(
                type='expense', date=today
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            today_transactions_count = user_transactions.filter(date=today).count()
        else:
            today_income = Decimal('0')
            today_expenses = Decimal('0')
            today_transactions_count = 0
        
        # Recent transactions for selected month (last 10)
        recent_transactions = user_transactions.filter(
            date__month=selected_month,
            date__year=selected_year
        )[:10]
        recent_transactions_data = TransactionSerializer(recent_transactions, many=True).data
        
        # Expense breakdown by category (for pie chart) - selected month
        expense_by_category = user_transactions.filter(
            type='expense',
            date__month=selected_month,
            date__year=selected_year
        ).values('category__name', 'category__color').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        # Income breakdown by category (for pie chart) - selected month
        income_by_category = user_transactions.filter(
            type='income',
            date__month=selected_month,
            date__year=selected_year
        ).values('category__name', 'category__color').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        # Monthly trend (last 6 months from selected month)
        from dateutil.relativedelta import relativedelta
        import calendar
        
        # Calculate 6 months back from selected month
        selected_date = datetime(selected_year, selected_month, 1)
        six_months_ago = selected_date - relativedelta(months=5)
        
        monthly_trend = user_transactions.filter(
            date__gte=six_months_ago.date(),
            date__lte=datetime(selected_year, selected_month, calendar.monthrange(selected_year, selected_month)[1]).date()
        ).annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            income=Sum('amount', filter=models.Q(type='income')),
            expense=Sum('amount', filter=models.Q(type='expense'))
        ).order_by('month')
        
        monthly_trend_data = [
            {
                'month': item['month'].strftime('%b %Y') if item['month'] else '',
                'income': float(item['income'] or 0),
                'expense': float(item['expense'] or 0),
            }
            for item in monthly_trend
        ]
        
        # Budget overview for selected month
        user_budgets = Budget.objects.filter(
            user=user,
            month=selected_month,
            year=selected_year,
            is_overall=False
        )
        
        # Check if budget exists for this month
        has_budget = user_budgets.exists() or Budget.objects.filter(
            user=user,
            month=selected_month,
            year=selected_year,
            is_overall=True
        ).exists()
        
        budget_overview = []
        for budget in user_budgets:
            if budget.category:
                spent = user_transactions.filter(
                    category=budget.category,
                    type='expense',
                    date__month=selected_month,
                    date__year=selected_year
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                
                percentage = (spent / budget.amount * 100) if budget.amount > 0 else 0
                budget_status = 'exceeded' if percentage >= 100 else ('warning' if percentage >= budget.alert_threshold else 'normal')
                
                budget_overview.append({
                    'id': budget.id,
                    'category': budget.category.name,
                    'category_color': budget.category.color,
                    'budget': float(budget.amount),
                    'spent': float(spent),
                    'percentage': float(percentage),
                    'status': budget_status,
                    'alert_threshold': budget.alert_threshold
                })
        
        # Overall monthly budget for selected month
        overall_budget = Budget.objects.filter(
            user=user,
            is_overall=True,
            month=selected_month,
            year=selected_year
        ).first()
        
        if overall_budget:
            monthly_budget = float(overall_budget.amount)
            budget_used_percentage = (float(monthly_expenses) / monthly_budget * 100) if monthly_budget > 0 else 0
            overall_status = 'exceeded' if budget_used_percentage >= 100 else ('warning' if budget_used_percentage >= overall_budget.alert_threshold else 'normal')
        else:
            monthly_budget = 0
            budget_used_percentage = 0
            overall_status = 'normal'
        
        # Get currency from profile
        try:
            currency = user.profile.currency
        except UserProfile.DoesNotExist:
            currency = 'INR'
        
        # Month name for display
        import calendar
        month_name = calendar.month_name[selected_month]
        
        # Transaction count for selected month
        selected_month_transactions_count = user_transactions.filter(
            date__month=selected_month,
            date__year=selected_year
        ).count()
        
        return Response({
            'success': True,
            'message': f'Dashboard for {month_name} {selected_year}',
            'user': user_data,
            'currency': currency,
            'selected_month': selected_month,
            'selected_year': selected_year,
            'is_current_month': is_current_month,
            'has_budget': has_budget,
            'dashboard': {
                # Main stats (total balance is across ALL time)
                'total_balance': float(total_balance),
                'monthly_income': float(monthly_income),
                'monthly_expenses': float(monthly_expenses),
                'savings': float(savings),
                'savings_rate': float(savings_rate),
                
                # Comparison with previous month
                'income_change': float(income_change),
                'expense_change': float(expense_change),
                
                # Today's stats (only for current month)
                'today': {
                    'income': float(today_income),
                    'expenses': float(today_expenses),
                    'transactions_count': today_transactions_count,
                },
                
                # Selected month stats
                'this_month': {
                    'income': float(monthly_income),
                    'expenses': float(monthly_expenses),
                    'transactions_count': selected_month_transactions_count,
                },
                
                # Budget
                'monthly_budget': monthly_budget,
                'budget_used_percentage': budget_used_percentage,
                'overall_status': overall_status,
                'budget_overview': budget_overview,
                
                # Charts data
                'expense_by_category': [
                    {
                        'name': item['category__name'] or 'Uncategorized',
                        'value': float(item['total']),
                        'color': item['category__color'] or '#6366f1'
                    }
                    for item in expense_by_category
                ],
                'income_by_category': [
                    {
                        'name': item['category__name'] or 'Uncategorized',
                        'value': float(item['total']),
                        'color': item['category__color'] or '#10b981'
                    }
                    for item in income_by_category
                ],
                'monthly_trend': monthly_trend_data,
                
                # Recent transactions for selected month
                'recent_transactions': recent_transactions_data,
            }
        }, status=status.HTTP_200_OK)


# Need to import models for Q filter
from django.db import models as models


class ForgotPasswordView(APIView):
    """
    API endpoint for requesting password reset.
    
    POST /api/auth/forgot-password/
    Request body: {email}
    Returns: Success message (always returns success for security)
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            
            # Invalidate any existing tokens
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
            
            # Create new reset token
            reset_token = PasswordResetToken.objects.create(user=user)
            
            # Build reset URL (frontend URL)
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token.token}"
            
            # Send email (will work when SMTP is configured)
            try:
                send_mail(
                    subject='Reset Your WealthWise Password',
                    message=f'''
Hello {user.get_short_name()},

You requested to reset your password. Click the link below to reset it:

{reset_url}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
WealthWise Team
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=True,  # Don't fail if email isn't configured
                )
            except Exception:
                pass  # Email will be sent when SMTP is configured
            
        except User.DoesNotExist:
            pass  # Don't reveal if user exists
        
        return Response({
            'success': True,
            'message': 'If an account exists with this email, you will receive a password reset link.',
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    API endpoint for resetting password with token.
    
    POST /api/auth/reset-password/
    Request body: {token, new_password, new_password_confirm}
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token_obj = serializer.validated_data['token_obj']
        user = token_obj.user
        
        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Mark token as used
        token_obj.is_used = True
        token_obj.save()
        
        return Response({
            'success': True,
            'message': 'Password reset successful! You can now login with your new password.',
        }, status=status.HTTP_200_OK)


class ValidateResetTokenView(APIView):
    """
    API endpoint for validating password reset token.
    
    GET /api/auth/validate-reset-token/<token>/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        try:
            token_obj = PasswordResetToken.objects.get(token=token)
            if token_obj.is_valid():
                return Response({
                    'success': True,
                    'message': 'Token is valid.',
                    'email': token_obj.user.email,
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'message': 'This reset link has expired. Please request a new one.',
                }, status=status.HTTP_400_BAD_REQUEST)
        except PasswordResetToken.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Invalid reset token.',
            }, status=status.HTTP_400_BAD_REQUEST)


class SetPasswordView(APIView):
    """
    API endpoint for setting password for Google users who want to add email login.
    
    POST /api/auth/set-password/
    Request body: {new_password, new_password_confirm}
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        serializer = SetNewPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'success': True,
            'message': 'Password set successfully! You can now login with email and password.',
        }, status=status.HTTP_200_OK)


# ============================================
# TRANSACTION VIEWS
# ============================================

class CategoryListCreateView(generics.ListCreateAPIView):
    """
    API endpoint for listing and creating categories.
    
    GET /api/categories/ - List all categories (default + user's custom)
    POST /api/categories/ - Create a new category
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CategorySerializer
    
    def get_queryset(self):
        # Return default categories + user's custom categories
        return Category.objects.filter(
            models.Q(is_default=True) | models.Q(user=self.request.user)
        )
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for category detail, update, delete.
    
    GET /api/categories/<id>/ - Get category details
    PUT/PATCH /api/categories/<id>/ - Update category
    DELETE /api/categories/<id>/ - Delete category (only user's custom categories)
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CategorySerializer
    
    def get_queryset(self):
        # Only allow users to modify their own categories
        return Category.objects.filter(user=self.request.user)


class TransactionListCreateView(generics.ListCreateAPIView):
    """
    API endpoint for listing and creating transactions.
    
    GET /api/transactions/ - List all user transactions
    POST /api/transactions/ - Create a new transaction
    
    Query params:
    - type: 'income' or 'expense'
    - category: category id
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - month: 1-12
    - year: YYYY
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer
    
    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user)
        
        # Filter by type
        transaction_type = self.request.query_params.get('type')
        if transaction_type:
            queryset = queryset.filter(type=transaction_type)
        
        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Filter by month/year
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month:
            queryset = queryset.filter(date__month=month)
        if year:
            queryset = queryset.filter(date__year=year)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Check budget alerts after creating expense transaction
        if serializer.validated_data.get('type') == 'expense':
            check_and_create_budget_alerts(request.user)
        
        return Response({
            'success': True,
            'message': 'Transaction added successfully!',
            'transaction': serializer.data
        }, status=status.HTTP_201_CREATED)


class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for transaction detail, update, delete.
    
    GET /api/transactions/<id>/ - Get transaction details
    PUT/PATCH /api/transactions/<id>/ - Update transaction
    DELETE /api/transactions/<id>/ - Delete transaction
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer
    
    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'success': True,
            'message': 'Transaction deleted successfully!'
        }, status=status.HTTP_200_OK)


class BudgetListCreateView(generics.ListCreateAPIView):
    """
    API endpoint for listing and creating budgets.
    
    GET /api/budgets/ - List all user budgets
    POST /api/budgets/ - Create a new budget
    
    Query params:
    - month: 1-12
    - year: YYYY
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BudgetSerializer
    
    def get_queryset(self):
        queryset = Budget.objects.filter(user=self.request.user)
        
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'success': True,
            'message': 'Budget created successfully!',
            'budget': serializer.data
        }, status=status.HTTP_201_CREATED)


class BudgetDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for budget detail, update, delete.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BudgetSerializer
    
    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'success': True,
            'message': 'Budget deleted successfully!'
        }, status=status.HTTP_200_OK)


# ============================================
# NOTIFICATION VIEWS & BUDGET ALERT FUNCTIONS
# ============================================

def check_and_create_budget_alerts(user, transaction=None):
    """
    Check budget limits and create notifications/send emails if necessary.
    Called after creating/updating transactions.
    """
    from django.core.mail import send_mail
    from django.conf import settings
    
    today = datetime.now().date()
    current_month = today.month
    current_year = today.year
    
    # Get user's budgets for current month
    user_budgets = Budget.objects.filter(
        user=user,
        month=current_month,
        year=current_year
    )
    
    # Get user profile for notification preferences
    try:
        profile = user.profile
        email_notifications = profile.email_notifications
        budget_alerts = profile.budget_alerts
        currency = profile.currency
    except UserProfile.DoesNotExist:
        email_notifications = True
        budget_alerts = True
        currency = 'INR'
    
    if not budget_alerts:
        return  # User has disabled budget alerts
    
    currency_symbols = {
        'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
        'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'SGD': 'S$',
    }
    symbol = currency_symbols.get(currency, currency)
    
    notifications_to_create = []
    
    for budget in user_budgets:
        # Calculate spent amount
        if budget.is_overall:
            spent = Transaction.objects.filter(
                user=user,
                type='expense',
                date__month=current_month,
                date__year=current_year
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        else:
            spent = Transaction.objects.filter(
                user=user,
                category=budget.category,
                type='expense',
                date__month=current_month,
                date__year=current_year
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        if budget.amount <= 0:
            continue
            
        percentage = (spent / budget.amount * 100)
        budget_name = "Overall Monthly Budget" if budget.is_overall else f"{budget.category.name} Budget"
        
        # Check if budget exceeded (100%+)
        if percentage >= 100:
            # Check if we already sent this notification today
            existing = Notification.objects.filter(
                user=user,
                type='budget_exceeded',
                data__budget_id=budget.id,
                created_at__date=today
            ).exists()
            
            if not existing:
                notification = Notification(
                    user=user,
                    type='budget_exceeded',
                    title=f'{budget_name} Exceeded!',
                    message=f'You have spent {symbol}{float(spent):,.2f} of your {symbol}{float(budget.amount):,.2f} budget ({percentage:.1f}%).',
                    data={
                        'budget_id': budget.id,
                        'category_id': budget.category.id if budget.category else None,
                        'spent': float(spent),
                        'budget_amount': float(budget.amount),
                        'percentage': float(percentage)
                    }
                )
                notifications_to_create.append(notification)
                
                # Send email if enabled
                if email_notifications:
                    try:
                        send_mail(
                            subject=f'⚠️ Budget Alert: {budget_name} Exceeded!',
                            message=f'''
Hello {user.get_short_name()},

Your {budget_name} has been exceeded!

Budget Amount: {symbol}{float(budget.amount):,.2f}
Amount Spent: {symbol}{float(spent):,.2f}
Percentage Used: {percentage:.1f}%

Please review your spending in the WealthWise app.

Best regards,
WealthWise Team
                            ''',
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[user.email],
                            fail_silently=True,
                        )
                        notification.email_sent = True
                    except Exception:
                        pass
        
        # Check if budget near limit (warning threshold)
        elif percentage >= budget.alert_threshold:
            existing = Notification.objects.filter(
                user=user,
                type='budget_warning',
                data__budget_id=budget.id,
                created_at__date=today
            ).exists()
            
            if not existing:
                notification = Notification(
                    user=user,
                    type='budget_warning',
                    title=f'{budget_name} Near Limit',
                    message=f'You have used {percentage:.1f}% of your {budget_name}. {symbol}{float(budget.amount - spent):,.2f} remaining.',
                    data={
                        'budget_id': budget.id,
                        'category_id': budget.category.id if budget.category else None,
                        'spent': float(spent),
                        'budget_amount': float(budget.amount),
                        'percentage': float(percentage)
                    }
                )
                notifications_to_create.append(notification)
                
                # Send warning email if enabled
                if email_notifications:
                    try:
                        send_mail(
                            subject=f'⚡ Budget Warning: {budget_name} at {percentage:.1f}%',
                            message=f'''
Hello {user.get_short_name()},

Your {budget_name} is approaching its limit!

Budget Amount: {symbol}{float(budget.amount):,.2f}
Amount Spent: {symbol}{float(spent):,.2f}
Remaining: {symbol}{float(budget.amount - spent):,.2f}
Percentage Used: {percentage:.1f}%

Consider reviewing your spending to stay within budget.

Best regards,
WealthWise Team
                            ''',
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[user.email],
                            fail_silently=True,
                        )
                        notification.email_sent = True
                    except Exception:
                        pass
    
    # Bulk create notifications
    if notifications_to_create:
        Notification.objects.bulk_create(notifications_to_create)


class NotificationListView(generics.ListAPIView):
    """
    API endpoint for listing user notifications.
    
    GET /api/notifications/ - List all user notifications
    Query params:
    - unread: true/false (filter by read status)
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user)
        
        unread = self.request.query_params.get('unread')
        if unread == 'true':
            queryset = queryset.filter(is_read=False)
        
        return queryset


class NotificationCountView(APIView):
    """
    API endpoint for getting unread notification count.
    
    GET /api/notifications/count/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({
            'success': True,
            'unread_count': count
        }, status=status.HTTP_200_OK)


class NotificationMarkReadView(APIView):
    """
    API endpoint for marking notifications as read.
    
    POST /api/notifications/mark-read/
    Request body: {notification_ids: [1, 2, 3]} or {all: true}
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        mark_all = request.data.get('all', False)
        notification_ids = request.data.get('notification_ids', [])
        
        if mark_all:
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
            message = 'All notifications marked as read.'
        elif notification_ids:
            Notification.objects.filter(
                user=request.user, 
                id__in=notification_ids
            ).update(is_read=True)
            message = f'{len(notification_ids)} notification(s) marked as read.'
        else:
            return Response({
                'success': False,
                'message': 'Please provide notification_ids or set all=true'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'message': message
        }, status=status.HTTP_200_OK)


class NotificationDeleteView(APIView):
    """
    API endpoint for deleting notifications.
    
    DELETE /api/notifications/<id>/
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, pk):
        try:
            notification = Notification.objects.get(user=request.user, id=pk)
            notification.delete()
            return Response({
                'success': True,
                'message': 'Notification deleted.'
            }, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Notification not found.'
            }, status=status.HTTP_404_NOT_FOUND)


class BudgetOverviewView(APIView):
    """
    API endpoint for comprehensive budget overview with alerts.
    Month-aware: Budgets are stored per month, never deleted.
    
    GET /api/budgets/overview/
    Query params:
    - month: 1-12 (optional, defaults to current month)
    - year: YYYY (optional, defaults to current year)
    
    Returns: Overall budget, category budgets with spent amounts, alerts
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        today = datetime.now().date()
        
        # Get selected month/year from query params (defaults to current)
        try:
            selected_month = int(request.query_params.get('month', today.month))
            selected_year = int(request.query_params.get('year', today.year))
            if selected_month < 1 or selected_month > 12:
                selected_month = today.month
            if selected_year < 2020 or selected_year > 2030:
                selected_year = today.year
        except (ValueError, TypeError):
            selected_month = today.month
            selected_year = today.year
        
        is_current_month = (selected_month == today.month and selected_year == today.year)
        
        # Get user's currency
        try:
            currency = user.profile.currency
        except UserProfile.DoesNotExist:
            currency = 'INR'
        
        # Get overall budget for selected month
        overall_budget = Budget.objects.filter(
            user=user,
            is_overall=True,
            month=selected_month,
            year=selected_year
        ).first()
        
        # Get category budgets for selected month
        category_budgets = Budget.objects.filter(
            user=user,
            is_overall=False,
            month=selected_month,
            year=selected_year
        )
        
        # Check if any budget exists for this month
        has_budget = overall_budget is not None or category_budgets.exists()
        
        # Calculate total expenses for the selected month
        total_expenses = Transaction.objects.filter(
            user=user,
            type='expense',
            date__month=selected_month,
            date__year=selected_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Total income for the selected month
        total_income = Transaction.objects.filter(
            user=user,
            type='income',
            date__month=selected_month,
            date__year=selected_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Build overall budget data
        overall_data = None
        if overall_budget:
            percentage = (total_expenses / overall_budget.amount * 100) if overall_budget.amount > 0 else 0
            budget_status = 'exceeded' if percentage >= 100 else ('warning' if percentage >= overall_budget.alert_threshold else 'normal')
            overall_data = {
                'id': overall_budget.id,
                'amount': float(overall_budget.amount),
                'spent': float(total_expenses),
                'remaining': float(overall_budget.amount - total_expenses),
                'percentage': float(percentage),
                'status': budget_status,
                'alert_threshold': overall_budget.alert_threshold,
            }
        
        # Build category budgets data
        category_data = []
        for budget in category_budgets:
            if budget.category:
                spent = Transaction.objects.filter(
                    user=user,
                    category=budget.category,
                    type='expense',
                    date__month=selected_month,
                    date__year=selected_year
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                
                percentage = (spent / budget.amount * 100) if budget.amount > 0 else 0
                budget_status = 'exceeded' if percentage >= 100 else ('warning' if percentage >= budget.alert_threshold else 'normal')
                
                category_data.append({
                    'id': budget.id,
                    'category_id': budget.category.id,
                    'category_name': budget.category.name,
                    'category_color': budget.category.color,
                    'amount': float(budget.amount),
                    'spent': float(spent),
                    'remaining': float(budget.amount - spent),
                    'percentage': float(percentage),
                    'status': budget_status,
                    'alert_threshold': budget.alert_threshold,
                })
        
        # Sort by percentage (highest first)
        category_data.sort(key=lambda x: x['percentage'], reverse=True)
        
        # Count alerts
        exceeded_count = sum(1 for c in category_data if c['status'] == 'exceeded')
        warning_count = sum(1 for c in category_data if c['status'] == 'warning')
        
        if overall_data:
            if overall_data['status'] == 'exceeded':
                exceeded_count += 1
            elif overall_data['status'] == 'warning':
                warning_count += 1
        
        # Month name for display
        import calendar
        month_name = calendar.month_name[selected_month]
        
        return Response({
            'success': True,
            'currency': currency,
            'month': selected_month,
            'year': selected_year,
            'month_name': month_name,
            'is_current_month': is_current_month,
            'has_budget': has_budget,
            'overall_budget': overall_data,
            'category_budgets': category_data,
            'total_expenses': float(total_expenses),
            'total_income': float(total_income),
        }, status=status.HTTP_200_OK)


def create_default_categories():
    """Create default categories if they don't exist."""
    default_categories = [
        # Expense categories
        {'name': 'Food & Dining', 'type': 'expense', 'icon': 'FiCoffee', 'color': '#f97316'},
        {'name': 'Transportation', 'type': 'expense', 'icon': 'FiTruck', 'color': '#3b82f6'},
        {'name': 'Shopping', 'type': 'expense', 'icon': 'FiShoppingBag', 'color': '#ec4899'},
        {'name': 'Entertainment', 'type': 'expense', 'icon': 'FiFilm', 'color': '#8b5cf6'},
        {'name': 'Bills & Utilities', 'type': 'expense', 'icon': 'FiZap', 'color': '#eab308'},
        {'name': 'Healthcare', 'type': 'expense', 'icon': 'FiHeart', 'color': '#ef4444'},
        {'name': 'Education', 'type': 'expense', 'icon': 'FiBook', 'color': '#06b6d4'},
        {'name': 'Personal Care', 'type': 'expense', 'icon': 'FiUser', 'color': '#14b8a6'},
        {'name': 'Rent & Housing', 'type': 'expense', 'icon': 'FiHome', 'color': '#64748b'},
        {'name': 'Travel', 'type': 'expense', 'icon': 'FiMapPin', 'color': '#0ea5e9'},
        {'name': 'Subscriptions', 'type': 'expense', 'icon': 'FiCreditCard', 'color': '#a855f7'},
        {'name': 'Other Expense', 'type': 'expense', 'icon': 'FiTag', 'color': '#6b7280'},
        
        # Income categories
        {'name': 'Salary', 'type': 'income', 'icon': 'FiBriefcase', 'color': '#10b981'},
        {'name': 'Freelance', 'type': 'income', 'icon': 'FiMonitor', 'color': '#22c55e'},
        {'name': 'Business', 'type': 'income', 'icon': 'FiTrendingUp', 'color': '#059669'},
        {'name': 'Investments', 'type': 'income', 'icon': 'FiBarChart', 'color': '#0d9488'},
        {'name': 'Gifts', 'type': 'income', 'icon': 'FiGift', 'color': '#f43f5e'},
        {'name': 'Refunds', 'type': 'income', 'icon': 'FiRefreshCw', 'color': '#84cc16'},
        {'name': 'Other Income', 'type': 'income', 'icon': 'FiPlus', 'color': '#6b7280'},
    ]
    
    for cat_data in default_categories:
        Category.objects.get_or_create(
            name=cat_data['name'],
            type=cat_data['type'],
            is_default=True,
            defaults={
                'icon': cat_data['icon'],
                'color': cat_data['color'],
            }
        )


class AnalyticsView(APIView):
    """
    Analytics & Insights API endpoint.
    Provides comprehensive financial analytics with smart insights.
    
    GET /api/analytics/
    Query params:
    - month: 1-12 (optional, defaults to current month)
    - year: YYYY (optional, defaults to current year)
    
    Returns: Charts data, spending insights, comparisons
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        today = datetime.now().date()
        
        # Get selected month/year from query params
        try:
            selected_month = int(request.query_params.get('month', today.month))
            selected_year = int(request.query_params.get('year', today.year))
            if selected_month < 1 or selected_month > 12:
                selected_month = today.month
            if selected_year < 2020 or selected_year > 2030:
                selected_year = today.year
        except (ValueError, TypeError):
            selected_month = today.month
            selected_year = today.year
        
        # Calculate previous month
        if selected_month == 1:
            prev_month = 12
            prev_month_year = selected_year - 1
        else:
            prev_month = selected_month - 1
            prev_month_year = selected_year
        
        # Get currency
        try:
            currency = user.profile.currency
        except UserProfile.DoesNotExist:
            currency = 'INR'
        
        currency_symbols = {
            'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
            'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'SGD': 'S$',
        }
        symbol = currency_symbols.get(currency, currency)
        
        # Get all user transactions
        user_transactions = Transaction.objects.filter(user=user)
        
        # ========================================
        # CHART 1: Expense by Category (Pie Chart)
        # ========================================
        expense_by_category = user_transactions.filter(
            type='expense',
            date__month=selected_month,
            date__year=selected_year
        ).values('category__name', 'category__color').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        expense_pie_data = [
            {
                'name': item['category__name'] or 'Uncategorized',
                'value': float(item['total']),
                'color': item['category__color'] or '#6366f1'
            }
            for item in expense_by_category
        ]
        
        # ========================================
        # CHART 2: Income vs Expense (Bar Chart)
        # ========================================
        # Last 6 months data
        from dateutil.relativedelta import relativedelta
        import calendar
        
        income_vs_expense_data = []
        for i in range(5, -1, -1):
            # Calculate month
            calc_date = datetime(selected_year, selected_month, 1) - relativedelta(months=i)
            m = calc_date.month
            y = calc_date.year
            
            month_income = user_transactions.filter(
                type='income', date__month=m, date__year=y
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            month_expense = user_transactions.filter(
                type='expense', date__month=m, date__year=y
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            income_vs_expense_data.append({
                'month': calendar.month_abbr[m],
                'year': y,
                'income': float(month_income),
                'expense': float(month_expense),
            })
        
        # ========================================
        # CHART 3: Monthly Spending Trend (Line Chart)
        # ========================================
        # Daily spending for selected month
        days_in_month = calendar.monthrange(selected_year, selected_month)[1]
        daily_spending = []
        cumulative = Decimal('0')
        
        for day in range(1, days_in_month + 1):
            day_expense = user_transactions.filter(
                type='expense',
                date__year=selected_year,
                date__month=selected_month,
                date__day=day
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            cumulative += day_expense
            daily_spending.append({
                'day': day,
                'expense': float(day_expense),
                'cumulative': float(cumulative)
            })
        
        # ========================================
        # SMART INSIGHTS
        # ========================================
        insights = []
        
        # Current month totals
        current_month_expenses = user_transactions.filter(
            type='expense',
            date__month=selected_month,
            date__year=selected_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        current_month_income = user_transactions.filter(
            type='income',
            date__month=selected_month,
            date__year=selected_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Previous month totals
        prev_month_expenses = user_transactions.filter(
            type='expense',
            date__month=prev_month,
            date__year=prev_month_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        prev_month_income = user_transactions.filter(
            type='income',
            date__month=prev_month,
            date__year=prev_month_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # INSIGHT 1: Highest Spending Category
        if expense_pie_data:
            top_category = expense_pie_data[0]
            total_expenses = sum(item['value'] for item in expense_pie_data)
            percentage_of_total = (top_category['value'] / total_expenses * 100) if total_expenses > 0 else 0
            
            insights.append({
                'type': 'highest_spending',
                'icon': '🏆',
                'title': 'Top Spending Category',
                'message': f"Your highest spending is on {top_category['name']} at {symbol}{top_category['value']:,.0f} ({percentage_of_total:.1f}% of total expenses).",
                'category': top_category['name'],
                'amount': top_category['value'],
                'percentage': percentage_of_total,
                'color': top_category['color'],
                'severity': 'info'
            })
        
        # INSIGHT 2: Month-to-Month Expense Comparison
        if prev_month_expenses > 0:
            expense_change = ((current_month_expenses - prev_month_expenses) / prev_month_expenses * 100)
            expense_diff = current_month_expenses - prev_month_expenses
            
            if expense_change > 0:
                insights.append({
                    'type': 'expense_comparison',
                    'icon': '📈',
                    'title': 'Spending Increase',
                    'message': f"You spent {expense_change:.1f}% more this month compared to last month ({symbol}{abs(expense_diff):,.0f} more).",
                    'change_percentage': float(expense_change),
                    'change_amount': float(expense_diff),
                    'severity': 'warning' if expense_change > 20 else 'info'
                })
            else:
                insights.append({
                    'type': 'expense_comparison',
                    'icon': '📉',
                    'title': 'Spending Decrease',
                    'message': f"Great job! You spent {abs(expense_change):.1f}% less this month compared to last month ({symbol}{abs(expense_diff):,.0f} saved).",
                    'change_percentage': float(expense_change),
                    'change_amount': float(expense_diff),
                    'severity': 'success'
                })
        elif current_month_expenses > 0:
            insights.append({
                'type': 'expense_comparison',
                'icon': '📊',
                'title': 'First Month Tracking',
                'message': f"You've spent {symbol}{current_month_expenses:,.0f} this month. Keep tracking to see trends!",
                'severity': 'info'
            })
        
        # INSIGHT 3: Income vs Expense Analysis
        savings = current_month_income - current_month_expenses
        savings_rate = (savings / current_month_income * 100) if current_month_income > 0 else 0
        
        if current_month_income > 0:
            if savings > 0:
                insights.append({
                    'type': 'savings',
                    'icon': '💰',
                    'title': 'Positive Savings',
                    'message': f"You're saving {symbol}{savings:,.0f} this month ({savings_rate:.1f}% savings rate). Keep it up!",
                    'savings': float(savings),
                    'savings_rate': float(savings_rate),
                    'severity': 'success'
                })
            else:
                insights.append({
                    'type': 'overspending',
                    'icon': '⚠️',
                    'title': 'Overspending Alert',
                    'message': f"You're spending more than you earn! Deficit: {symbol}{abs(savings):,.0f}. Consider reducing expenses.",
                    'deficit': float(abs(savings)),
                    'severity': 'danger'
                })
        
        # INSIGHT 4: Category-wise Comparison with Previous Month
        category_comparisons = []
        for cat_data in expense_pie_data[:5]:  # Top 5 categories
            cat_name = cat_data['name']
            current_cat_expense = cat_data['value']
            
            # Get previous month expense for same category
            prev_cat_expense = user_transactions.filter(
                type='expense',
                category__name=cat_name,
                date__month=prev_month,
                date__year=prev_month_year
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            if prev_cat_expense > 0:
                change_pct = ((Decimal(str(current_cat_expense)) - prev_cat_expense) / prev_cat_expense * 100)
                if abs(change_pct) > 15:  # Only show significant changes
                    category_comparisons.append({
                        'category': cat_name,
                        'color': cat_data['color'],
                        'current': current_cat_expense,
                        'previous': float(prev_cat_expense),
                        'change_percentage': float(change_pct),
                        'increased': change_pct > 0
                    })
        
        # Add category comparison insights
        for comp in category_comparisons[:3]:  # Top 3 significant changes
            if comp['increased']:
                insights.append({
                    'type': 'category_increase',
                    'icon': '🔺',
                    'title': f"{comp['category']} Spending Up",
                    'message': f"You spent {comp['change_percentage']:.1f}% more on {comp['category']} compared to last month.",
                    'category': comp['category'],
                    'change_percentage': comp['change_percentage'],
                    'color': comp['color'],
                    'severity': 'warning' if comp['change_percentage'] > 25 else 'info'
                })
            else:
                insights.append({
                    'type': 'category_decrease',
                    'icon': '🔻',
                    'title': f"{comp['category']} Spending Down",
                    'message': f"You spent {abs(comp['change_percentage']):.1f}% less on {comp['category']} compared to last month.",
                    'category': comp['category'],
                    'change_percentage': comp['change_percentage'],
                    'color': comp['color'],
                    'severity': 'success'
                })
        
        # INSIGHT 5: Budget Alerts (if budgets exist)
        user_budgets = Budget.objects.filter(
            user=user,
            month=selected_month,
            year=selected_year
        )
        
        budget_alerts = []
        for budget in user_budgets:
            if budget.is_overall:
                spent = current_month_expenses
                budget_name = "Overall Budget"
            elif budget.category:
                spent = user_transactions.filter(
                    type='expense',
                    category=budget.category,
                    date__month=selected_month,
                    date__year=selected_year
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                budget_name = budget.category.name
            else:
                continue
            
            if budget.amount > 0:
                usage_pct = (spent / budget.amount * 100)
                if usage_pct >= 100:
                    budget_alerts.append({
                        'type': 'exceeded',
                        'name': budget_name,
                        'spent': float(spent),
                        'budget': float(budget.amount),
                        'percentage': float(usage_pct)
                    })
                    insights.append({
                        'type': 'budget_exceeded',
                        'icon': '🚨',
                        'title': f'{budget_name} Budget Exceeded',
                        'message': f"You've exceeded your {budget_name} budget by {symbol}{float(spent - budget.amount):,.0f} ({usage_pct:.1f}% used).",
                        'severity': 'danger'
                    })
                elif usage_pct >= budget.alert_threshold:
                    budget_alerts.append({
                        'type': 'warning',
                        'name': budget_name,
                        'spent': float(spent),
                        'budget': float(budget.amount),
                        'percentage': float(usage_pct)
                    })
        
        # INSIGHT 6: Average Daily Spending
        if current_month_expenses > 0:
            days_passed = min(today.day, days_in_month) if (selected_month == today.month and selected_year == today.year) else days_in_month
            avg_daily = current_month_expenses / days_passed if days_passed > 0 else 0
            projected_monthly = avg_daily * days_in_month
            
            insights.append({
                'type': 'daily_average',
                'icon': '📅',
                'title': 'Daily Spending Average',
                'message': f"Your average daily spending is {symbol}{avg_daily:,.0f}. Projected monthly: {symbol}{projected_monthly:,.0f}.",
                'daily_average': float(avg_daily),
                'projected_monthly': float(projected_monthly),
                'severity': 'info'
            })
        
        # Summary stats
        month_name = calendar.month_name[selected_month]
        
        return Response({
            'success': True,
            'currency': currency,
            'currency_symbol': symbol,
            'month': selected_month,
            'year': selected_year,
            'month_name': month_name,
            'summary': {
                'total_income': float(current_month_income),
                'total_expenses': float(current_month_expenses),
                'savings': float(savings),
                'savings_rate': float(savings_rate),
                'transaction_count': user_transactions.filter(
                    date__month=selected_month,
                    date__year=selected_year
                ).count()
            },
            'charts': {
                'expense_by_category': expense_pie_data,
                'income_vs_expense': income_vs_expense_data,
                'daily_spending': daily_spending,
            },
            'insights': insights,
            'budget_alerts': budget_alerts,
            'comparison': {
                'prev_month_expenses': float(prev_month_expenses),
                'prev_month_income': float(prev_month_income),
                'expense_change': float(((current_month_expenses - prev_month_expenses) / prev_month_expenses * 100) if prev_month_expenses > 0 else 0),
                'income_change': float(((current_month_income - prev_month_income) / prev_month_income * 100) if prev_month_income > 0 else 0),
            }
        }, status=status.HTTP_200_OK)


class AnalyticsDateRangeView(APIView):
    """
    Flexible Date-Range Analytics API endpoint.
    Allows users to analyze financial data across any selected time period.
    
    GET /api/analytics/range/
    Query params:
    - range: 'last_7_days', 'last_30_days', 'last_3_months', 'last_6_months', 'last_1_year', 'custom'
    - start_date: YYYY-MM-DD (required if range='custom')
    - end_date: YYYY-MM-DD (required if range='custom')
    
    Returns: Aggregated analytics data for the selected date range
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        today = datetime.now().date()
        
        # Get date range parameters
        range_type = request.query_params.get('range', 'last_30_days')
        
        # Calculate date range based on range_type
        from dateutil.relativedelta import relativedelta
        import calendar
        
        if range_type == 'last_7_days':
            start_date = today - timedelta(days=6)
            end_date = today
            range_label = 'Last 7 Days'
        elif range_type == 'last_30_days':
            start_date = today - timedelta(days=29)
            end_date = today
            range_label = 'Last 30 Days'
        elif range_type == 'last_3_months':
            start_date = today - relativedelta(months=3) + timedelta(days=1)
            end_date = today
            range_label = 'Last 3 Months'
        elif range_type == 'last_6_months':
            start_date = today - relativedelta(months=6) + timedelta(days=1)
            end_date = today
            range_label = 'Last 6 Months'
        elif range_type == 'last_1_year':
            start_date = today - relativedelta(years=1) + timedelta(days=1)
            end_date = today
            range_label = 'Last 1 Year'
        elif range_type == 'custom':
            try:
                start_date_str = request.query_params.get('start_date')
                end_date_str = request.query_params.get('end_date')
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                range_label = f"{start_date.strftime('%b %d, %Y')} - {end_date.strftime('%b %d, %Y')}"
            except (ValueError, TypeError):
                return Response({
                    'success': False,
                    'message': 'Invalid date format. Use YYYY-MM-DD.'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            start_date = today - timedelta(days=29)
            end_date = today
            range_label = 'Last 30 Days'
        
        # Validate date range
        if start_date > end_date:
            return Response({
                'success': False,
                'message': 'Start date cannot be after end date.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate days in range
        days_in_range = (end_date - start_date).days + 1
        
        # Get currency
        try:
            currency = user.profile.currency
        except UserProfile.DoesNotExist:
            currency = 'INR'
        
        currency_symbols = {
            'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
            'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'SGD': 'S$',
        }
        symbol = currency_symbols.get(currency, currency)
        
        # Get transactions within date range
        range_transactions = Transaction.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date
        )
        
        # ========================================
        # SUMMARY STATISTICS
        # ========================================
        total_income = range_transactions.filter(type='income').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
        
        total_expenses = range_transactions.filter(type='expense').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
        
        net_savings = total_income - total_expenses
        savings_rate = (net_savings / total_income * 100) if total_income > 0 else Decimal('0')
        
        transaction_count = range_transactions.count()
        income_count = range_transactions.filter(type='income').count()
        expense_count = range_transactions.filter(type='expense').count()
        
        # Average per day
        avg_daily_expense = total_expenses / days_in_range if days_in_range > 0 else Decimal('0')
        avg_daily_income = total_income / days_in_range if days_in_range > 0 else Decimal('0')
        
        # Calculate number of months in range (for monthly average)
        months_in_range = max(1, days_in_range / 30)
        avg_monthly_expense = total_expenses / Decimal(str(months_in_range))
        avg_monthly_income = total_income / Decimal(str(months_in_range))
        
        # ========================================
        # EXPENSE BY CATEGORY (Pie Chart)
        # ========================================
        expense_by_category = range_transactions.filter(type='expense').values(
            'category__name', 'category__color', 'category__icon'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        expense_pie_data = [
            {
                'name': item['category__name'] or 'Uncategorized',
                'value': float(item['total']),
                'color': item['category__color'] or '#6366f1',
                'icon': item['category__icon'] or 'FiTag',
                'count': item['count'],
                'percentage': float((item['total'] / total_expenses * 100) if total_expenses > 0 else 0)
            }
            for item in expense_by_category
        ]
        
        # ========================================
        # INCOME BY CATEGORY (Pie Chart)
        # ========================================
        income_by_category = range_transactions.filter(type='income').values(
            'category__name', 'category__color', 'category__icon'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        income_pie_data = [
            {
                'name': item['category__name'] or 'Uncategorized',
                'value': float(item['total']),
                'color': item['category__color'] or '#10b981',
                'icon': item['category__icon'] or 'FiTag',
                'count': item['count'],
                'percentage': float((item['total'] / total_income * 100) if total_income > 0 else 0)
            }
            for item in income_by_category
        ]
        
        # ========================================
        # INCOME VS EXPENSE TREND (Bar/Line Chart)
        # ========================================
        trend_data = []
        
        if days_in_range > 180:  # Group by month for large ranges
            current = datetime(start_date.year, start_date.month, 1)
            end_month = datetime(end_date.year, end_date.month, 1)
            
            while current <= end_month:
                m_start = current.date()
                m_end = (current + relativedelta(months=1) - timedelta(days=1)).date()
                m_end = min(m_end, end_date)
                m_start = max(m_start, start_date)
                
                m_income = range_transactions.filter(
                    type='income', date__gte=m_start, date__lte=m_end
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                
                m_expense = range_transactions.filter(
                    type='expense', date__gte=m_start, date__lte=m_end
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                
                trend_data.append({
                    'label': current.strftime('%b %Y'),
                    'period': current.strftime('%Y-%m'),
                    'income': float(m_income),
                    'expense': float(m_expense),
                    'savings': float(m_income - m_expense)
                })
                
                current += relativedelta(months=1)
        elif days_in_range > 30:  # Group by week
            current = start_date
            week_num = 1
            
            while current <= end_date:
                w_end = min(current + timedelta(days=6), end_date)
                
                w_income = range_transactions.filter(
                    type='income', date__gte=current, date__lte=w_end
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                
                w_expense = range_transactions.filter(
                    type='expense', date__gte=current, date__lte=w_end
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                
                trend_data.append({
                    'label': f"Week {week_num}",
                    'period': f"{current.strftime('%b %d')} - {w_end.strftime('%b %d')}",
                    'income': float(w_income),
                    'expense': float(w_expense),
                    'savings': float(w_income - w_expense)
                })
                
                current = w_end + timedelta(days=1)
                week_num += 1
        else:  # Group by day
            current = start_date
            while current <= end_date:
                d_income = range_transactions.filter(
                    type='income', date=current
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                
                d_expense = range_transactions.filter(
                    type='expense', date=current
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                
                trend_data.append({
                    'label': current.strftime('%b %d'),
                    'period': current.strftime('%Y-%m-%d'),
                    'income': float(d_income),
                    'expense': float(d_expense),
                    'savings': float(d_income - d_expense)
                })
                
                current += timedelta(days=1)
        
        # ========================================
        # CUMULATIVE SPENDING TREND
        # ========================================
        cumulative_data = []
        cumulative_expense = Decimal('0')
        cumulative_income = Decimal('0')
        
        current = start_date
        while current <= end_date:
            d_expense = range_transactions.filter(
                type='expense', date=current
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            d_income = range_transactions.filter(
                type='income', date=current
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            cumulative_expense += d_expense
            cumulative_income += d_income
            
            cumulative_data.append({
                'date': current.strftime('%Y-%m-%d'),
                'label': current.strftime('%b %d'),
                'cumulative_expense': float(cumulative_expense),
                'cumulative_income': float(cumulative_income),
                'cumulative_savings': float(cumulative_income - cumulative_expense)
            })
            
            current += timedelta(days=1)
        
        # ========================================
        # SMART INSIGHTS FOR DATE RANGE
        # ========================================
        insights = []
        
        # Insight 1: Top Spending Category
        if expense_pie_data:
            top_cat = expense_pie_data[0]
            insights.append({
                'type': 'top_spending',
                'icon': '🏆',
                'title': 'Highest Spending Category',
                'message': f"You spent the most on {top_cat['name']} - {symbol}{top_cat['value']:,.0f} ({top_cat['percentage']:.1f}% of total).",
                'category': top_cat['name'],
                'amount': top_cat['value'],
                'percentage': top_cat['percentage'],
                'color': top_cat['color'],
                'severity': 'info'
            })
        
        # Insight 2: Savings Analysis
        if total_income > 0:
            if net_savings > 0:
                insights.append({
                    'type': 'savings_positive',
                    'icon': '💰',
                    'title': 'Great Savings!',
                    'message': f"You saved {symbol}{net_savings:,.0f} in this period ({savings_rate:.1f}% savings rate).",
                    'amount': float(net_savings),
                    'rate': float(savings_rate),
                    'severity': 'success'
                })
            else:
                insights.append({
                    'type': 'savings_negative',
                    'icon': '⚠️',
                    'title': 'Overspending Alert',
                    'message': f"You spent {symbol}{abs(net_savings):,.0f} more than you earned in this period.",
                    'amount': float(abs(net_savings)),
                    'severity': 'danger'
                })
        
        # Insight 3: Average Daily Spending
        insights.append({
            'type': 'daily_average',
            'icon': '📊',
            'title': 'Daily Spending Average',
            'message': f"You spent an average of {symbol}{avg_daily_expense:,.0f} per day over {days_in_range} days.",
            'amount': float(avg_daily_expense),
            'days': days_in_range,
            'severity': 'info'
        })
        
        # Insight 4: Monthly Average
        if months_in_range >= 1:
            insights.append({
                'type': 'monthly_average',
                'icon': '📅',
                'title': 'Monthly Average',
                'message': f"Average monthly spending: {symbol}{avg_monthly_expense:,.0f} | Average monthly income: {symbol}{avg_monthly_income:,.0f}.",
                'avg_expense': float(avg_monthly_expense),
                'avg_income': float(avg_monthly_income),
                'severity': 'info'
            })
        
        # Insight 5: Transaction Frequency
        avg_transactions_per_day = transaction_count / days_in_range if days_in_range > 0 else 0
        insights.append({
            'type': 'transaction_frequency',
            'icon': '🔄',
            'title': 'Transaction Activity',
            'message': f"You made {transaction_count} transactions ({income_count} income, {expense_count} expenses) - avg {avg_transactions_per_day:.1f}/day.",
            'total': transaction_count,
            'income_count': income_count,
            'expense_count': expense_count,
            'avg_per_day': avg_transactions_per_day,
            'severity': 'info'
        })
        
        # Insight 6: Highest Spending Day
        highest_day = range_transactions.filter(type='expense').values('date').annotate(
            total=Sum('amount')
        ).order_by('-total').first()
        
        if highest_day:
            insights.append({
                'type': 'highest_day',
                'icon': '📆',
                'title': 'Highest Spending Day',
                'message': f"Your highest spending day was {highest_day['date'].strftime('%B %d, %Y')} with {symbol}{highest_day['total']:,.0f} spent.",
                'date': highest_day['date'].strftime('%Y-%m-%d'),
                'amount': float(highest_day['total']),
                'severity': 'info'
            })
        
        # Insight 7: Category Distribution (if more than 3 categories)
        if len(expense_pie_data) >= 3:
            top_3_pct = sum(c['percentage'] for c in expense_pie_data[:3])
            insights.append({
                'type': 'category_concentration',
                'icon': '🎯',
                'title': 'Spending Concentration',
                'message': f"Your top 3 categories account for {top_3_pct:.1f}% of all expenses.",
                'top_3_percentage': top_3_pct,
                'categories': [c['name'] for c in expense_pie_data[:3]],
                'severity': 'info'
            })
        
        # ========================================
        # COMPARISON WITH PREVIOUS PERIOD
        # ========================================
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=days_in_range - 1)
        
        prev_transactions = Transaction.objects.filter(
            user=user,
            date__gte=prev_start_date,
            date__lte=prev_end_date
        )
        
        prev_income = prev_transactions.filter(type='income').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
        prev_expenses = prev_transactions.filter(type='expense').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
        
        expense_change_pct = float(((total_expenses - prev_expenses) / prev_expenses * 100) if prev_expenses > 0 else 0)
        income_change_pct = float(((total_income - prev_income) / prev_income * 100) if prev_income > 0 else 0)
        
        comparison = {
            'prev_period': {
                'start_date': prev_start_date.strftime('%Y-%m-%d'),
                'end_date': prev_end_date.strftime('%Y-%m-%d'),
                'income': float(prev_income),
                'expenses': float(prev_expenses),
            },
            'expense_change_pct': expense_change_pct,
            'income_change_pct': income_change_pct,
            'expense_change_amount': float(total_expenses - prev_expenses),
            'income_change_amount': float(total_income - prev_income),
        }
        
        # Add comparison insight
        if prev_expenses > 0:
            if expense_change_pct > 0:
                insights.append({
                    'type': 'period_comparison',
                    'icon': '📈',
                    'title': 'Spending vs Previous Period',
                    'message': f"You spent {expense_change_pct:.1f}% more compared to the previous {days_in_range} days.",
                    'change_pct': expense_change_pct,
                    'severity': 'warning' if expense_change_pct > 20 else 'info'
                })
            else:
                insights.append({
                    'type': 'period_comparison',
                    'icon': '📉',
                    'title': 'Spending vs Previous Period',
                    'message': f"Great! You spent {abs(expense_change_pct):.1f}% less compared to the previous {days_in_range} days.",
                    'change_pct': expense_change_pct,
                    'severity': 'success'
                })
        
        return Response({
            'success': True,
            'currency': currency,
            'currency_symbol': symbol,
            'range': {
                'type': range_type,
                'label': range_label,
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d'),
                'days': days_in_range,
            },
            'summary': {
                'total_income': float(total_income),
                'total_expenses': float(total_expenses),
                'net_savings': float(net_savings),
                'savings_rate': float(savings_rate),
                'transaction_count': transaction_count,
                'income_count': income_count,
                'expense_count': expense_count,
                'avg_daily_expense': float(avg_daily_expense),
                'avg_daily_income': float(avg_daily_income),
                'avg_monthly_expense': float(avg_monthly_expense),
                'avg_monthly_income': float(avg_monthly_income),
            },
            'charts': {
                'expense_by_category': expense_pie_data,
                'income_by_category': income_pie_data,
                'trend': trend_data,
                'cumulative': cumulative_data,
            },
            'insights': insights,
            'comparison': comparison,
        }, status=status.HTTP_200_OK)
