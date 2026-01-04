import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import DashboardLayout from '../components/DashboardLayout';
import { 
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiPieChart,
  FiDollarSign,
  FiTarget,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
  'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
  'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'SGD': 'S$',
};

const Budget = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [modalType, setModalType] = useState('overall'); // 'overall' or 'category'
  
  // Month-aware state
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    alert_threshold: 80
  });
  const [submitting, setSubmitting] = useState(false);

  // Get currency from user profile
  const currency = user?.profile?.currency || 'INR';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return `${currencySymbol}0`;
    return `${currencySymbol}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };
  
  // Check if viewing current month
  const isCurrentMonth = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
  
  // Month names for display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const fetchBudgetData = async () => {
    try {
      const response = await authService.getBudgetOverview({ month: selectedMonth, year: selectedYear });
      setBudgetData(response);
    } catch (error) {
      console.error('Failed to fetch budget data:', error);
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await authService.getCategories();
      // Filter only expense categories
      setCategories(response.filter(cat => cat.type === 'expense'));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchBudgetData();
    fetchCategories();
  }, [selectedMonth, selectedYear]);
  
  // Navigate months
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  const goToCurrentMonth = () => {
    setSelectedMonth(today.getMonth() + 1);
    setSelectedYear(today.getFullYear());
  };

  const openAddOverallModal = () => {
    setEditingBudget(null);
    setModalType('overall');
    setFormData({
      amount: budgetData?.overall_budget?.amount || '',
      category: '',
      alert_threshold: budgetData?.overall_budget?.alert_threshold || 80
    });
    setShowModal(true);
  };

  const openAddCategoryModal = () => {
    setEditingBudget(null);
    setModalType('category');
    setFormData({
      amount: '',
      category: '',
      alert_threshold: 80
    });
    setShowModal(true);
  };

  const openEditModal = (budget, isOverall = false) => {
    setEditingBudget(budget);
    setModalType(isOverall ? 'overall' : 'category');
    setFormData({
      amount: budget.amount,
      category: budget.category_id || '',
      alert_threshold: budget.alert_threshold || 80
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) {
      toast.error('Please enter budget amount');
      return;
    }
    if (modalType === 'category' && !formData.category && !editingBudget) {
      toast.error('Please select a category');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        amount: parseFloat(formData.amount),
        month: selectedMonth,
        year: selectedYear,
        alert_threshold: parseInt(formData.alert_threshold),
        is_overall: modalType === 'overall',
      };

      if (modalType === 'category') {
        data.category = parseInt(formData.category) || editingBudget?.category_id;
      }

      if (editingBudget) {
        await authService.updateBudget(editingBudget.id, data);
        toast.success('Budget updated successfully!');
      } else {
        await authService.createBudget(data);
        toast.success('Budget created successfully!');
      }
      
      setShowModal(false);
      fetchBudgetData();
    } catch (error) {
      console.error('Failed to save budget:', error);
      toast.error(error.response?.data?.message || 'Failed to save budget');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await authService.deleteBudget(id);
      toast.success('Budget deleted successfully!');
      setDeleteConfirm(null);
      fetchBudgetData();
    } catch (error) {
      console.error('Failed to delete budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'exceeded':
        return <FiAlertCircle className="text-red-500" size={20} />;
      case 'warning':
        return <FiAlertTriangle className="text-amber-500" size={20} />;
      default:
        return <FiCheckCircle className="text-green-500" size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'exceeded':
        return 'from-red-500 to-red-600';
      case 'warning':
        return 'from-amber-500 to-amber-600';
      default:
        return 'from-emerald-500 to-teal-500';
    }
  };

  const getProgressColor = (status) => {
    switch (status) {
      case 'exceeded':
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      default:
        return 'bg-emerald-500';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const displayMonthName = monthNames[selectedMonth - 1];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header with Month Navigation */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Budget Management</h1>
              <p className="text-gray-600 mt-1">Track and manage your spending limits</p>
            </div>
            {isCurrentMonth && (
              <button
                onClick={openAddCategoryModal}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                <FiPlus size={20} />
                Add Category Budget
              </button>
            )}
          </div>
          
          {/* Month Navigation */}
          <div className="mt-4 flex items-center justify-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous month"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-900">
                {displayMonthName} {selectedYear}
              </span>
              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                >
                  Today
                </button>
              )}
              {isCurrentMonth && (
                <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full">Current</span>
              )}
            </div>
            
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Next month"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* No Budget Prompt */}
        {!budgetData?.has_budget && (
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl text-center">
            <FiTarget className="mx-auto text-4xl text-blue-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Budget Set for {displayMonthName}</h3>
            <p className="text-gray-600 mb-4">
              {isCurrentMonth 
                ? "Set your monthly budget to start tracking your spending."
                : "No budget was set for this month. View other months or go to current month to set a budget."}
            </p>
            {isCurrentMonth && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={openAddOverallModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Set Overall Budget
                </button>
                <button
                  onClick={openAddCategoryModal}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Add Category Budget
                </button>
              </div>
            )}
          </div>
        )}

        {/* Alert Summary */}
        {budgetData?.alerts && (budgetData.alerts.exceeded_count > 0 || budgetData.alerts.warning_count > 0) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-red-50 border border-amber-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <FiAlertTriangle className="text-amber-500" size={24} />
              <div>
                <p className="font-medium text-gray-900">Budget Alerts</p>
                <p className="text-sm text-gray-600">
                  {budgetData.alerts.exceeded_count > 0 && (
                    <span className="text-red-600 font-medium">{budgetData.alerts.exceeded_count} budget(s) exceeded</span>
                  )}
                  {budgetData.alerts.exceeded_count > 0 && budgetData.alerts.warning_count > 0 && ' • '}
                  {budgetData.alerts.warning_count > 0 && (
                    <span className="text-amber-600 font-medium">{budgetData.alerts.warning_count} budget(s) near limit</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overall Budget Card */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Overall Monthly Budget</h2>
            {!budgetData?.overall_budget && (
              <button
                onClick={openAddOverallModal}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                + Set Overall Budget
              </button>
            )}
          </div>
          
          {budgetData?.overall_budget ? (
            <div className={`bg-gradient-to-r ${getStatusColor(budgetData.overall_budget.status)} rounded-2xl p-6 text-white`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                    <FiTarget size={28} />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">Monthly Budget</p>
                    <p className="text-3xl font-bold">{formatCurrency(budgetData.overall_budget.amount)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(budgetData.overall_budget, true)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(budgetData.overall_budget.id)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="h-3 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(budgetData.overall_budget.percentage, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-white/80">
                  Spent: {formatCurrency(budgetData.overall_budget.spent)}
                </span>
                <span className="font-semibold">
                  {budgetData.overall_budget.percentage.toFixed(1)}% used
                </span>
                <span className="text-white/80">
                  Remaining: {formatCurrency(Math.max(0, budgetData.overall_budget.remaining))}
                </span>
              </div>
              
              {budgetData.overall_budget.status !== 'normal' && (
                <div className="mt-4 p-3 bg-white/20 rounded-xl flex items-center gap-2">
                  {budgetData.overall_budget.status === 'exceeded' ? (
                    <>
                      <FiAlertCircle size={18} />
                      <span className="text-sm font-medium">Budget exceeded! You've overspent by {formatCurrency(Math.abs(budgetData.overall_budget.remaining))}</span>
                    </>
                  ) : (
                    <>
                      <FiAlertTriangle size={18} />
                      <span className="text-sm font-medium">Warning: Budget near limit ({budgetData.overall_budget.alert_threshold}% threshold)</span>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-2xl p-8 text-center">
              <FiTarget className="mx-auto text-4xl text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">No overall budget set for this month</p>
              <button
                onClick={openAddOverallModal}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Set Monthly Budget
              </button>
            </div>
          )}
        </div>

        {/* Category Budgets */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Budgets</h2>
          
          {budgetData?.category_budgets?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetData.category_budgets.map((budget) => (
                <div 
                  key={budget.id} 
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${budget.category_color}20` }}
                      >
                        <FiPieChart size={24} style={{ color: budget.category_color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{budget.category_name}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(budget.status)}
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(budget)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(budget.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(budget.status)}`}
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className={`font-medium ${
                      budget.status === 'exceeded' ? 'text-red-600' : 
                      budget.status === 'warning' ? 'text-amber-600' : 'text-gray-600'
                    }`}>
                      {budget.percentage.toFixed(1)}% used
                    </span>
                    <span className="text-gray-500">
                      {budget.remaining >= 0 ? (
                        <>{formatCurrency(budget.remaining)} left</>
                      ) : (
                        <span className="text-red-600">{formatCurrency(Math.abs(budget.remaining))} over</span>
                      )}
                    </span>
                  </div>
                  
                  {budget.status !== 'normal' && (
                    <div className={`mt-3 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                      budget.status === 'exceeded' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {budget.status === 'exceeded' ? (
                        <><FiAlertCircle size={14} /> Budget exceeded!</>
                      ) : (
                        <><FiAlertTriangle size={14} /> Approaching limit</>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <FiPieChart className="mx-auto text-4xl text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">No category budgets set for this month</p>
              <button
                onClick={openAddCategoryModal}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Add Category Budget
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiDollarSign className="text-blue-600" size={20} />
              </div>
              <span className="text-gray-600 text-sm">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(budgetData?.total_expenses || 0)}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <FiCheckCircle className="text-emerald-600" size={20} />
              </div>
              <span className="text-gray-600 text-sm">On Track</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {budgetData?.category_budgets?.filter(b => b.status === 'normal').length || 0}
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <FiAlertCircle className="text-red-600" size={20} />
              </div>
              <span className="text-gray-600 text-sm">Needs Attention</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {(budgetData?.alerts?.exceeded_count || 0) + (budgetData?.alerts?.warning_count || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingBudget ? 'Edit Budget' : (modalType === 'overall' ? 'Set Monthly Budget' : 'Add Category Budget')}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category (only for category budgets) */}
              {modalType === 'category' && !editingBudget && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {/* Alert Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alert Threshold: {formData.alert_threshold}%
                </label>
                <input
                  type="range"
                  value={formData.alert_threshold}
                  onChange={(e) => setFormData({ ...formData, alert_threshold: e.target.value })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  min="50"
                  max="95"
                  step="5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You'll receive a warning when spending reaches {formData.alert_threshold}% of budget
                </p>
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
                  className={`flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all ${
                    submitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? 'Saving...' : (editingBudget ? 'Update' : 'Create')}
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Budget?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. Are you sure you want to delete this budget?
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

export default Budget;
