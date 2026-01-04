import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import DashboardLayout from '../components/DashboardLayout';
import { 
  FiPlus,
  FiArrowUpRight,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSearch,
  FiDollarSign,
  FiBriefcase,
  FiTrendingUp
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
  'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
  'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'SGD': 'S$',
};

const Income = () => {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Get currency from user profile
  const currency = user?.profile?.currency || 'INR';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return `${currencySymbol}0`;
    return `${currencySymbol}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fetchIncomes = async () => {
    try {
      const params = { type: 'income' };
      if (filterCategory) params.category = filterCategory;
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        params.month = month;
        params.year = year;
      }
      const response = await authService.getTransactions(params);
      setIncomes(response);
    } catch (error) {
      console.error('Failed to fetch incomes:', error);
      toast.error('Failed to load income data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await authService.getCategories();
      // Filter only income categories
      setCategories(response.filter(cat => cat.type === 'income'));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchIncomes();
    fetchCategories();
  }, [filterCategory, filterMonth]);

  const openAddModal = () => {
    setEditingIncome(null);
    setFormData({
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (income) => {
    setEditingIncome(income);
    setFormData({
      amount: income.amount,
      description: income.description,
      category: income.category?.toString() || '',
      date: income.date,
      notes: income.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        type: 'income',
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: parseInt(formData.category),
        date: formData.date,
        payment_method: 'bank_transfer',
        notes: formData.notes
      };

      if (editingIncome) {
        await authService.updateTransaction(editingIncome.id, data);
        toast.success('Income updated successfully!');
      } else {
        await authService.createTransaction(data);
        toast.success('Income added successfully!');
      }
      
      setShowModal(false);
      fetchIncomes();
    } catch (error) {
      console.error('Failed to save income:', error);
      toast.error('Failed to save income');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await authService.deleteTransaction(id);
      toast.success('Income deleted successfully!');
      setDeleteConfirm(null);
      fetchIncomes();
    } catch (error) {
      console.error('Failed to delete income:', error);
      toast.error('Failed to delete income');
    }
  };

  // Filter incomes by search
  const filteredIncomes = incomes.filter(income => 
    income.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (income.category_name && income.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate totals
  const totalIncome = filteredIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
  
  // Group by source/category
  const incomeBySource = filteredIncomes.reduce((acc, income) => {
    const source = income.category_name || 'Other';
    acc[source] = (acc[source] || 0) + parseFloat(income.amount);
    return acc;
  }, {});

  // Get top sources
  const topSources = Object.entries(incomeBySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Income</h1>
            <p className="text-gray-600 mt-1">Track and manage your income sources</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            <FiPlus size={20} />
            Add Income
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Income Card */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white col-span-1 sm:col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <FiTrendingUp size={24} />
              </div>
              <div>
                <p className="text-green-100 text-sm">Total Income</p>
                <p className="text-3xl font-bold">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
            <p className="text-green-100 text-sm mt-2">
              {filteredIncomes.length} income entries
            </p>
          </div>

          {/* Top Sources */}
          {topSources.slice(0, 2).map(([source, amount], index) => (
            <div key={source} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  index === 0 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <FiBriefcase size={20} />
                </div>
                <span className="text-gray-500 text-sm">{source}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(amount)}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search income..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            {/* Source/Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Sources</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            {/* Month Filter */}
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            
            {/* Clear Filters */}
            {(filterCategory || filterMonth || searchQuery) && (
              <button
                onClick={() => {
                  setFilterCategory('');
                  setFilterMonth('');
                  setSearchQuery('');
                }}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Income List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredIncomes.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredIncomes.map((income) => (
                <div 
                  key={income.id} 
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center"
                      style={{ backgroundColor: income.category_color ? `${income.category_color}20` : undefined }}
                    >
                      <FiArrowUpRight size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{income.description}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: income.category_color ? `${income.category_color}20` : '#dcfce7',
                            color: income.category_color || '#16a34a'
                          }}
                        >
                          {income.category_name || 'Other Income'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-green-600">+{formatCurrency(income.amount)}</p>
                      <p className="text-sm text-gray-500">{formatDate(income.date)}</p>
                    </div>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(income)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(income.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400">
              <FiDollarSign className="mx-auto text-5xl mb-4" />
              <p className="text-lg">No income records found</p>
              <p className="text-sm mt-1">Start by adding your first income entry</p>
              <button
                onClick={openAddModal}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                <FiPlus className="inline mr-2" />
                Add Income
              </button>
            </div>
          )}
        </div>

        {/* Income Count */}
        {filteredIncomes.length > 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            Showing {filteredIncomes.length} income record{filteredIncomes.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Add/Edit Income Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingIncome ? 'Edit Income' : 'Add Income'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Monthly Salary, Freelance Project"
                  required
                />
              </div>

              {/* Source/Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select income source</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows="2"
                  placeholder="Any additional details..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all ${
                    submitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? 'Saving...' : (editingIncome ? 'Update Income' : 'Add Income')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Income?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. Are you sure you want to delete this income record?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Income;
