from django.core.management.base import BaseCommand
from handler.models import Category


class Command(BaseCommand):
    help = 'Seed default categories for expenses and income'

    def handle(self, *args, **options):
        default_categories = [
            # Expense categories
            {'name': 'Food & Dining', 'type': 'expense', 'icon': '🍔', 'color': '#f97316'},
            {'name': 'Transportation', 'type': 'expense', 'icon': '🚗', 'color': '#3b82f6'},
            {'name': 'Shopping', 'type': 'expense', 'icon': '🛍️', 'color': '#ec4899'},
            {'name': 'Entertainment', 'type': 'expense', 'icon': '🎬', 'color': '#8b5cf6'},
            {'name': 'Bills & Utilities', 'type': 'expense', 'icon': '⚡', 'color': '#eab308'},
            {'name': 'Healthcare', 'type': 'expense', 'icon': '🏥', 'color': '#ef4444'},
            {'name': 'Education', 'type': 'expense', 'icon': '📚', 'color': '#06b6d4'},
            {'name': 'Personal Care', 'type': 'expense', 'icon': '💆', 'color': '#14b8a6'},
            {'name': 'Rent & Housing', 'type': 'expense', 'icon': '🏠', 'color': '#64748b'},
            {'name': 'Travel', 'type': 'expense', 'icon': '✈️', 'color': '#0ea5e9'},
            {'name': 'Subscriptions', 'type': 'expense', 'icon': '📱', 'color': '#a855f7'},
            {'name': 'Other Expense', 'type': 'expense', 'icon': '📋', 'color': '#6b7280'},
            
            # Income categories
            {'name': 'Salary', 'type': 'income', 'icon': '💼', 'color': '#10b981'},
            {'name': 'Freelance', 'type': 'income', 'icon': '💻', 'color': '#22c55e'},
            {'name': 'Business', 'type': 'income', 'icon': '📈', 'color': '#059669'},
            {'name': 'Investments', 'type': 'income', 'icon': '💰', 'color': '#0d9488'},
            {'name': 'Gifts', 'type': 'income', 'icon': '🎁', 'color': '#f43f5e'},
            {'name': 'Refunds', 'type': 'income', 'icon': '💵', 'color': '#84cc16'},
            {'name': 'Other Income', 'type': 'income', 'icon': '➕', 'color': '#6b7280'},
        ]

        created_count = 0
        updated_count = 0
        for cat_data in default_categories:
            category, created = Category.objects.update_or_create(
                name=cat_data['name'],
                type=cat_data['type'],
                defaults={
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'is_default': True,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created category: {cat_data['name']}")
            else:
                updated_count += 1
                self.stdout.write(f"Updated category: {cat_data['name']}")

        self.stdout.write(
            self.style.SUCCESS(f'Successfully seeded categories: {created_count} created, {updated_count} updated')
        )
