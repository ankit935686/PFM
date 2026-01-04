from django.core.management.base import BaseCommand
from handler.models import Category


class Command(BaseCommand):
    help = 'Seed default categories for expenses and income'

    def handle(self, *args, **options):
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

        created_count = 0
        for cat_data in default_categories:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                type=cat_data['type'],
                is_default=True,
                defaults={
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created category: {cat_data['name']}")

        self.stdout.write(
            self.style.SUCCESS(f'Successfully seeded {created_count} categories (total: {len(default_categories)})')
        )
