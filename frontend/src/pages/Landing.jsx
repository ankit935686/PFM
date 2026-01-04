import { Link } from 'react-router-dom';
import { FiTrendingUp, FiPieChart, FiShield, FiSmartphone, FiTarget, FiClock } from 'react-icons/fi';

const Landing = () => {
  const features = [
    { icon: <FiTrendingUp />, title: 'Expense Tracking', desc: 'Automatically categorize and track all your expenses in real-time' },
    { icon: <FiPieChart />, title: 'Budget Planning', desc: 'Create custom budgets and get alerts when you\'re close to limits' },
    { icon: <FiTarget />, title: 'Financial Goals', desc: 'Set and track savings goals with visual progress indicators' },
    { icon: <FiShield />, title: 'Bank-Level Security', desc: 'Your data is encrypted and protected with enterprise-grade security' },
    { icon: <FiSmartphone />, title: 'Mobile Friendly', desc: 'Access your finances anywhere with our responsive design' },
    { icon: <FiClock />, title: 'Real-Time Sync', desc: 'All your data syncs instantly across all your devices' },
  ];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="min-h-[calc(100vh-4rem)] flex items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          {/* Hero Content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-block px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-semibold mb-6">
              🚀 Smart Financial Management
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Take Control of Your{' '}
              <span className="gradient-text">Financial Future</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
              Track expenses, set budgets, and achieve your financial goals with WealthWise. 
              Your personal finance companion that makes money management simple and effective.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Link to="/signup" className="btn-primary text-center">Get Started Free</Link>
              <Link to="/login" className="btn-secondary text-center">Sign In</Link>
            </div>
            
            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">10K+</div>
                <div className="text-sm text-gray-500">Active Users</div>
              </div>
              <div className="w-px h-12 bg-gray-200"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">$2M+</div>
                <div className="text-sm text-gray-500">Tracked</div>
              </div>
              <div className="w-px h-12 bg-gray-200"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">4.9★</div>
                <div className="text-sm text-gray-500">Rating</div>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="flex-1 flex justify-center">
            <div className="space-y-4 transform lg:rotate-3 lg:perspective-1000">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-xl min-w-[280px]">
                <div className="text-sm opacity-80">Total Balance</div>
                <div className="text-3xl font-bold mt-1">$24,562.00</div>
                <div className="text-sm text-green-300 mt-2">+12.5% this month</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-xl">
                <div className="text-sm text-gray-500">Monthly Expenses</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">$3,240.00</div>
                <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                  <div className="h-full w-[65%] bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-xl">
                <div className="text-sm text-gray-500">Savings Goal</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">78%</div>
                <div className="text-sm text-gray-500">$7,800 of $10,000</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Money
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to help you track, analyze, and optimize your finances
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl text-indigo-500 mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-500 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Finances?
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Join thousands of users who have already taken control of their financial future
          </p>
          <Link to="/signup" className="inline-block bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
            Start Your Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-bold text-white">WealthWise</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 WealthWise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
