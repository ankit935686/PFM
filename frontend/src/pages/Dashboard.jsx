import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import DashboardLayout from '../components/DashboardLayout';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiPieChart,
  FiPlus,
  FiArrowUpRight,
  FiArrowDownRight,
  FiCalendar,
  FiTarget,
  FiActivity,
  FiX,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'AUD': 'A$',
  'CAD': 'C$',
  'CHF': 'CHF',
  'CNY': '¥',
  'SGD': 'S$',
};

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactionType, setTransactionType] = useState('expense');
  const [categories, setCategories] = useState([]);
  
  // Month-aware state
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Check if viewing current month
  const isCurrentMonth = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
  
  // Month names
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const fetchDashboard = async () => {
    try {
      const response = await authService.getDashboard({ month: selectedMonth, year: selectedYear });
      setDashboardData(response);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await authService.getCategories();
      setCategories(response);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboard();
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

  const currency = dashboardData?.currency || 'INR';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return `${currencySymbol}0`;
    return `${currencySymbol}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newTransaction.amount || !newTransaction.description || !newTransaction.category) return;

    setSubmitting(true);
    try {
      await authService.createTransaction({
        type: transactionType,
        amount: parseFloat(newTransaction.amount),
        description: newTransaction.description,
        category: parseInt(newTransaction.category),
        date: newTransaction.date,
        notes: newTransaction.notes
      });
      
      setNewTransaction({
        amount: '',
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowAddTransaction(false);
      fetchDashboard();
    } catch (error) {
      console.error('Failed to add transaction:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const dashboard = dashboardData?.dashboard || {};

  // Stats cards data
  const stats = [
    { 
      title: 'Total Balance', 
      value: formatCurrency(dashboard.total_balance), 
      changeValue: '',
      positive: (dashboard.total_balance || 0) >= 0,
      icon: <FiDollarSign />,
      color: 'from-indigo-500 to-purple-600'
    },
    { 
      title: 'Monthly Income', 
      value: formatCurrency(dashboard.monthly_income), 
      changeValue: `${(dashboard.income_change || 0) >= 0 ? '+' : ''}${(dashboard.income_change || 0).toFixed(1)}%`,
      positive: (dashboard.income_change || 0) >= 0,
      icon: <FiTrendingUp />,
      color: 'from-green-500 to-emerald-600'
    },
    { 
      title: 'Monthly Expenses', 
      value: formatCurrency(dashboard.monthly_expenses), 
      changeValue: `${(dashboard.expense_change || 0) >= 0 ? '+' : ''}${(dashboard.expense_change || 0).toFixed(1)}%`,
      positive: (dashboard.expense_change || 0) <= 0,
      icon: <FiTrendingDown />,
      color: 'from-orange-500 to-red-500'
    },
    { 
      title: 'Savings', 
      value: formatCurrency(dashboard.savings), 
      changeValue: `${(dashboard.savings_rate || 0).toFixed(1)}%`,
      positive: (dashboard.savings || 0) >= 0,
      icon: <FiPieChart />,
      color: 'from-cyan-500 to-blue-600'
    },
  ];

  // Quick stats
  const quickStats = [
    {
      title: 'Today',
      income: formatCurrency(dashboard.today?.income || 0),
      expenses: formatCurrency(dashboard.today?.expenses || 0),
      transactions: dashboard.today?.transactions_count || 0,
      icon: <FiCalendar className="text-indigo-500" />
    },
    {
      title: 'This Month',
      income: formatCurrency(dashboard.this_month?.income || 0),
      expenses: formatCurrency(dashboard.this_month?.expenses || 0),
      transactions: dashboard.this_month?.transactions_count || 0,
      icon: <FiActivity className="text-purple-500" />
    }
  ];

  const COLORS = ['#6366f1', '#f97316', '#10b981', '#ec4899', '#8b5cf6', '#3b82f6', '#eab308', '#ef4444'];

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {user?.first_name || user?.username || 'User'}! 👋
            </h1>
            <p className="text-gray-600 mt-1">Here's what's happening with your finances{isCurrentMonth ? ' today' : ` in ${monthNames[selectedMonth - 1]} ${selectedYear}`}.</p>
          </div>
          {isCurrentMonth && (
            <button
              onClick={() => setShowAddTransaction(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              <FiPlus size={20} />
              Add Transaction
            </button>
          )}
        </div>
        
        {/* Month Navigation */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiChevronLeft size={24} className="text-gray-600" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FiCalendar className="text-indigo-500" size={20} />
                <span className="text-lg font-semibold text-gray-800">
                  {monthNames[selectedMonth - 1]} {selectedYear}
                </span>
              </div>
              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="px-3 py-1 text-sm bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
                >
                  Go to Current Month
                </button>
              )}
            </div>
            
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiChevronRight size={24} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-white text-xl`}>
                  {stat.icon}
                </div>
                {stat.changeValue && (
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${stat.positive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                    {stat.changeValue}
                  </span>
                )}
              </div>
              <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Budget Progress Bar */}
        {dashboard.monthly_budget > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white">
                  <FiTarget size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Monthly Budget</h3>
                  <p className="text-sm text-gray-500">Track your spending limit</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(dashboard.monthly_expenses)} / {formatCurrency(dashboard.monthly_budget)}
                </p>
                <p className={`text-sm ${dashboard.budget_used_percentage > 90 ? 'text-red-500' : dashboard.budget_used_percentage > 70 ? 'text-amber-500' : 'text-green-500'}`}>
                  {(dashboard.budget_used_percentage || 0).toFixed(1)}% used
                </p>
              </div>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  dashboard.budget_used_percentage > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                  dashboard.budget_used_percentage > 70 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                  'bg-gradient-to-r from-green-500 to-emerald-500'
                }`}
                style={{ width: `${Math.min(dashboard.budget_used_percentage || 0, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  {stat.icon}
                </div>
                <h3 className="font-semibold text-gray-900">{stat.title}</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Income</p>
                  <p className="text-lg font-semibold text-green-600">{stat.income}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Expenses</p>
                  <p className="text-lg font-semibold text-red-500">{stat.expenses}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Transactions</p>
                  <p className="text-lg font-semibold text-gray-900">{stat.transactions}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Expense Pie Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h2>
            {dashboard.expense_by_category?.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <div className="w-full lg:w-1/2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboard.expense_by_category}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {dashboard.expense_by_category.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full lg:w-1/2 space-y-2">
                  {dashboard.expense_by_category.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}></div>
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FiPieChart className="mx-auto text-4xl mb-2" />
                  <p>No expense data yet</p>
                </div>
              </div>
            )}
          </div>

          {/* Monthly Trend Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h2>
            {dashboard.monthly_trend?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboard.monthly_trend}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(value) => `${currencySymbol}${(value/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                    <Area type="monotone" dataKey="expense" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FiTrendingUp className="mx-auto text-4xl mb-2" />
                  <p>No trend data yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
              <button className="text-indigo-500 text-sm font-medium hover:underline">View All</button>
            </div>
            {dashboard.recent_transactions?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recent_transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                      }`}>
                        {transaction.type === 'income' ? <FiArrowUpRight /> : <FiArrowDownRight />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500">{transaction.category_name || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400">
                <FiActivity className="mx-auto text-4xl mb-2" />
                <p>No transactions yet</p>
                <button onClick={() => setShowAddTransaction(true)} className="mt-4 text-indigo-500 font-medium hover:underline">
                  Add your first transaction
                </button>
              </div>
            )}
          </div>

          {/* Budget Overview */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Category Budgets</h2>
              <button className="w-8 h-8 bg-indigo-500 text-white rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors">
                <FiPlus size={18} />
              </button>
            </div>
            {dashboard.budget_overview?.length > 0 ? (
              <div className="space-y-5">
                {dashboard.budget_overview.map((budget, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{budget.category}</span>
                      <span className="text-sm text-gray-500">{formatCurrency(budget.spent)} / {formatCurrency(budget.budget)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(budget.percentage, 100)}%`, backgroundColor: budget.percentage > 90 ? '#ef4444' : budget.percentage > 70 ? '#f97316' : budget.category_color || '#6366f1' }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">
                <FiTarget className="mx-auto text-4xl mb-2" />
                <p className="text-sm">No category budgets set</p>
              </div>
            )}
            
            {/* Quick Actions */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setTransactionType('expense'); setShowAddTransaction(true); }} className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                  Add Expense
                </button>
                <button onClick={() => { setTransactionType('income'); setShowAddTransaction(true); }} className="p-3 bg-green-50 text-green-600 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                  Add Income
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Transaction</h2>
              <button onClick={() => setShowAddTransaction(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>

            {/* Transaction Type Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6">
              <button
                onClick={() => setTransactionType('expense')}
                className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${transactionType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Expense
              </button>
              <button
                onClick={() => setTransactionType('income')}
                className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${transactionType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Income
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                  <input
                    type="number"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="What was this for?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.filter(cat => cat.type === transactionType).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows="2"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddTransaction(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${transactionType === 'expense' ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg'} ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submitting ? 'Adding...' : `Add ${transactionType === 'expense' ? 'Expense' : 'Income'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
