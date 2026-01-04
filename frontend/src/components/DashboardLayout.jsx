import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import authService from '../services/authService';
import { FiBell } from 'react-icons/fi';

const DashboardLayout = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotificationCount = async () => {
    try {
      const response = await authService.getNotificationCount();
      setUnreadCount(response.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  useEffect(() => {
    fetchNotificationCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      {/* Top Header Bar with Notification Bell */}
      <div className="lg:ml-64 transition-all duration-300">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 lg:px-8 py-3">
          <div className="flex items-center justify-end">
            <Link 
              to="/notifications"
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <FiBell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
        
        <main className="min-h-screen">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
