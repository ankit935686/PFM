from django.urls import path
from .views import (
    SignupView,
    LoginView,
    GoogleAuthView,
    LogoutView,
    CustomTokenRefreshView,
    UserProfileView,
    ChangePasswordView,
    DashboardView,
    ForgotPasswordView,
    ResetPasswordView,
    ValidateResetTokenView,
    SetPasswordView,
    CategoryListCreateView,
    CategoryDetailView,
    TransactionListCreateView,
    TransactionDetailView,
    BudgetListCreateView,
    BudgetDetailView,
    BudgetOverviewView,
    NotificationListView,
    NotificationCountView,
    NotificationMarkReadView,
    NotificationDeleteView,
    AnalyticsView,
    AnalyticsDateRangeView,
)

urlpatterns = [
    # Authentication endpoints
    path('auth/signup/', SignupView.as_view(), name='signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/google/', GoogleAuthView.as_view(), name='google-auth'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', CustomTokenRefreshView.as_view(), name='token-refresh'),
    
    # Password management endpoints
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('auth/validate-reset-token/<uuid:token>/', ValidateResetTokenView.as_view(), name='validate-reset-token'),
    path('auth/set-password/', SetPasswordView.as_view(), name='set-password'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # User profile endpoints
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    
    # Dashboard endpoint
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    
    # Category endpoints
    path('categories/', CategoryListCreateView.as_view(), name='category-list'),
    path('categories/<int:pk>/', CategoryDetailView.as_view(), name='category-detail'),
    
    # Transaction endpoints
    path('transactions/', TransactionListCreateView.as_view(), name='transaction-list'),
    path('transactions/<int:pk>/', TransactionDetailView.as_view(), name='transaction-detail'),
    
    # Budget endpoints
    path('budgets/', BudgetListCreateView.as_view(), name='budget-list'),
    path('budgets/overview/', BudgetOverviewView.as_view(), name='budget-overview'),
    path('budgets/<int:pk>/', BudgetDetailView.as_view(), name='budget-detail'),
    
    # Notification endpoints
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/count/', NotificationCountView.as_view(), name='notification-count'),
    path('notifications/mark-read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/<int:pk>/', NotificationDeleteView.as_view(), name='notification-delete'),
    
    # Analytics endpoint
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
    path('analytics/range/', AnalyticsDateRangeView.as_view(), name='analytics-range'),
]
