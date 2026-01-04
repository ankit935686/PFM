import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import DashboardLayout from '../components/DashboardLayout';
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiPieChart,
  FiBarChart2,
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiDollarSign,
  FiTarget,
  FiClock,
  FiFilter
} from 'react-icons/fi';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart
} from 'recharts';
import toast from 'react-hot-toast';

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
  'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
  'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'SGD': 'S$',
};

// Date range presets
const DATE_RANGE_PRESETS = [
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'last_1_year', label: 'Last 1 Year' },
  { value: 'custom', label: 'Custom Range' },
];

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // View mode: 'monthly' or 'range'
  const [viewMode, setViewMode] = useState('monthly');
  
  // Monthly view state
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [monthlyData, setMonthlyData] = useState(null);
  
  // Date range view state
  const [rangeType, setRangeType] = useState('last_30_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [rangeData, setRangeData] = useState(null);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Fetch monthly analytics
  const fetchMonthlyAnalytics = async () => {
    try {
      setLoading(true);
      const response = await authService.getAnalytics({ month: selectedMonth, year: selectedYear });
      setMonthlyData(response);
    } catch (error) {
      console.error('Failed to fetch monthly analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch date range analytics
  const fetchRangeAnalytics = async () => {
    try {
      setLoading(true);
      const params = { range: rangeType };
      if (rangeType === 'custom') {
        if (!customStartDate || !customEndDate) {
          toast.error('Please select both start and end dates');
          setLoading(false);
          return;
        }
        params.start_date = customStartDate;
        params.end_date = customEndDate;
      }
      const response = await authService.getAnalyticsRange(params);
      setRangeData(response);
    } catch (error) {
      console.error('Failed to fetch range analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'monthly') {
      fetchMonthlyAnalytics();
    }
  }, [selectedMonth, selectedYear, viewMode]);

  useEffect(() => {
    if (viewMode === 'range' && rangeType !== 'custom') {
      fetchRangeAnalytics();
    }
  }, [rangeType, viewMode]);

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

  const currentData = viewMode === 'monthly' ? monthlyData : rangeData;
  const currency = currentData?.currency || 'INR';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return `${currencySymbol}0`;
    return `${currencySymbol}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  // Severity colors for insights
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'danger':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'success':
        return <FiCheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <FiAlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'danger':
        return <FiAlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <FiInfo className="w-5 h-5 text-blue-500" />;
    }
  };

  const COLORS = ['#6366f1', '#f97316', '#10b981', '#ec4899', '#8b5cf6', '#3b82f6', '#eab308', '#ef4444'];

  if (loading && !currentData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const summary = currentData?.summary || {};
  const charts = currentData?.charts || {};
  const insights = currentData?.insights || [];
  const comparison = currentData?.comparison || {};

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FiBarChart2 className="text-indigo-500" />
            Analytics & Insights
          </h1>
          <p className="text-gray-600 mt-1">Deep dive into your financial patterns and smart recommendations.</p>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 border border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiCalendar className="inline mr-2" />
                Monthly View
              </button>
              <button
                onClick={() => setViewMode('range')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'range'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiFilter className="inline mr-2" />
                Date Range
              </button>
            </div>
            
            {viewMode === 'monthly' ? (
              /* Monthly Navigation */
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={goToPrevMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiChevronLeft size={20} className="text-gray-600" />
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <FiCalendar className="text-indigo-500" size={18} />
                  <span className="font-semibold text-gray-800">
                    {monthNames[selectedMonth - 1]} {selectedYear}
                  </span>
                </div>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiChevronRight size={20} className="text-gray-600" />
                </button>
              </div>
            ) : (
              /* Date Range Selector */
              <div className="flex flex-wrap items-center gap-3 ml-auto">
                <select
                  value={rangeType}
                  onChange={(e) => setRangeType(e.target.value)}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {DATE_RANGE_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                
                {rangeType === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={fetchRangeAnalytics}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                    >
                      Apply
                    </button>
                  </>
                )}
                
                {rangeData?.range && (
                  <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                    <FiClock className="inline mr-1" />
                    {rangeData.range.days} days
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiTrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-white/80">Total Income</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary?.total_income)}</p>
            {comparison?.income_change_pct !== undefined && comparison?.income_change_pct !== 0 && (
              <p className={`text-sm mt-1 ${comparison?.income_change_pct >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {comparison?.income_change_pct >= 0 ? '↑' : '↓'} {Math.abs(comparison?.income_change_pct || comparison?.income_change || 0).toFixed(1)}% vs prev
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiTrendingDown className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-white/80">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary?.total_expenses)}</p>
            {comparison?.expense_change_pct !== undefined && comparison?.expense_change_pct !== 0 && (
              <p className={`text-sm mt-1 ${comparison?.expense_change_pct <= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {comparison?.expense_change_pct >= 0 ? '↑' : '↓'} {Math.abs(comparison?.expense_change_pct || comparison?.expense_change || 0).toFixed(1)}% vs prev
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiDollarSign className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-white/80">Net Savings</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary?.savings || summary?.net_savings)}</p>
            <p className="text-sm mt-1 text-white/80">
              {(summary?.savings_rate || 0).toFixed(1)}% savings rate
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiActivity className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-white/80">Transactions</span>
            </div>
            <p className="text-2xl font-bold">{summary?.transaction_count || 0}</p>
            <p className="text-sm mt-1 text-white/80">
              {viewMode === 'range' && summary?.avg_daily_expense 
                ? `${formatCurrency(summary.avg_daily_expense)}/day avg`
                : 'This period'
              }
            </p>
          </div>
        </div>

        {/* Additional Stats for Range View */}
        {viewMode === 'range' && summary?.avg_monthly_expense && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Avg Daily Expense</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(summary.avg_daily_expense)}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Avg Monthly Expense</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(summary.avg_monthly_expense)}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Avg Monthly Income</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(summary.avg_monthly_income)}</div>
            </div>
          </div>
        )}

        {/* Smart Insights Section */}
        {insights && insights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">💡</span> Smart Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 ${getSeverityStyles(insight.severity)} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{insight.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                      <p className="text-sm mt-1 text-gray-700">{insight.message}</p>
                    </div>
                    {getSeverityIcon(insight.severity)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Expense by Category - Pie Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiPieChart className="text-indigo-500" />
              Expense by Category
            </h3>
            {charts?.expense_by_category?.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.expense_by_category}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {charts.expense_by_category.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FiPieChart size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No expense data for this period</p>
                </div>
              </div>
            )}
            
            {/* Legend */}
            {charts?.expense_by_category?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                {charts.expense_by_category.slice(0, 6).map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Income vs Expense - Bar Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiBarChart2 className="text-indigo-500" />
              {viewMode === 'monthly' ? 'Income vs Expense (6 Months)' : 'Income vs Expense Trend'}
            </h3>
            {(viewMode === 'monthly' ? charts?.income_vs_expense : charts?.trend)?.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={viewMode === 'monthly' ? charts.income_vs_expense : charts.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey={viewMode === 'monthly' ? 'month' : 'label'} 
                      tick={{ fill: '#6b7280', fontSize: 12 }} 
                    />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => `${currencySymbol}${(value/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FiBarChart2 size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spending Trend Line Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiActivity className="text-indigo-500" />
            {viewMode === 'monthly' 
              ? `Daily Spending Trend - ${monthNames[selectedMonth - 1]} ${selectedYear}`
              : `Cumulative Trend - ${rangeData?.range?.label || 'Selected Period'}`
            }
          </h3>
          {(viewMode === 'monthly' ? charts?.daily_spending : charts?.cumulative)?.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'monthly' ? (
                  <AreaChart data={charts.daily_spending}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickFormatter={(day) => day % 5 === 0 || day === 1 ? day : ''}
                    />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => `${currencySymbol}${(value/1000).toFixed(1)}k`} />
                    <Tooltip 
                      formatter={(value, name) => [formatCurrency(value), name === 'expense' ? 'Daily' : 'Cumulative']}
                      labelFormatter={(day) => `Day ${day}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="expense" 
                      name="Daily Expense" 
                      stroke="#f97316" 
                      fillOpacity={1} 
                      fill="url(#colorExpense)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative" 
                      name="Cumulative" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                ) : (
                  <ComposedChart data={charts.cumulative}>
                    <defs>
                      <linearGradient id="colorCumExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCumIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => `${currencySymbol}${(value/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="cumulative_income" 
                      name="Cumulative Income" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorCumIncome)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumulative_expense" 
                      name="Cumulative Expense" 
                      stroke="#f97316" 
                      fillOpacity={1} 
                      fill="url(#colorCumExpense)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative_savings" 
                      name="Net Savings" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FiActivity size={48} className="mx-auto mb-3 opacity-50" />
                <p>No spending data for this period</p>
              </div>
            </div>
          )}
        </div>

        {/* Income by Category (Range view only) */}
        {viewMode === 'range' && charts?.income_by_category?.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-emerald-500" />
              Income by Category
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.income_by_category}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {charts.income_by_category.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center">
                {charts.income_by_category.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{formatCurrency(item.value)}</span>
                      <span className="text-sm text-gray-500 ml-2">({item.percentage?.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Breakdown Table */}
        {charts?.expense_by_category?.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiTarget className="text-indigo-500" />
              Expense Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Category</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Percentage</th>
                    {viewMode === 'range' && (
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Transactions</th>
                    )}
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 hidden md:table-cell">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {charts.expense_by_category.map((item, index) => {
                    const totalExpenses = charts.expense_by_category.reduce((sum, i) => sum + i.value, 0);
                    const percentage = item.percentage || (totalExpenses > 0 ? (item.value / totalExpenses * 100) : 0);
                    
                    return (
                      <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium text-gray-900">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatCurrency(item.value)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {percentage.toFixed(1)}%
                        </td>
                        {viewMode === 'range' && (
                          <td className="py-3 px-4 text-right text-gray-600 hidden sm:table-cell">
                            {item.count || '-'}
                          </td>
                        )}
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: item.color || COLORS[index % COLORS.length]
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">Total</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatCurrency(charts.expense_by_category.reduce((sum, i) => sum + i.value, 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-600">100%</td>
                    {viewMode === 'range' && (
                      <td className="py-3 px-4 text-right font-bold text-gray-600 hidden sm:table-cell">
                        {charts.expense_by_category.reduce((sum, i) => sum + (i.count || 0), 0)}
                      </td>
                    )}
                    <td className="py-3 px-4 hidden md:table-cell"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!charts?.expense_by_category?.length && !charts?.income_vs_expense?.length && !charts?.trend?.length && !insights?.length) && (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <FiBarChart2 size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Data Yet</h3>
            <p className="text-gray-600 mb-4">
              Start adding transactions to see your analytics and insights here.
            </p>
            <a 
              href="/transactions" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              Add Your First Transaction
            </a>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
