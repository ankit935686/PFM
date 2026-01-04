import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiX, FiUser, FiLogOut, FiGrid, FiSettings } from 'react-icons/fi';
import { useState } from 'react';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setDropdownOpen(false);
  };

  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-bold gradient-text">WealthWise</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-600 hover:text-indigo-500 font-medium transition-colors">Home</Link>
            <a href="#features" className="text-gray-600 hover:text-indigo-500 font-medium transition-colors">Features</a>
            <a href="#about" className="text-gray-600 hover:text-indigo-500 font-medium transition-colors">About</a>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full hover:border-indigo-500 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <FiUser size={16} />
                    )}
                  </div>
                  <span className="font-medium text-gray-700">{user?.username || 'User'}</span>
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <Link 
                      to="/dashboard" 
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-indigo-500 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <FiGrid size={18} /> Dashboard
                    </Link>
                    <Link 
                      to="/profile" 
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-indigo-500 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <FiSettings size={18} /> Profile
                    </Link>
                    <hr className="my-2 border-gray-100" />
                    <button 
                      onClick={handleLogout} 
                      className="flex items-center gap-3 w-full px-4 py-2 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <FiLogOut size={18} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Login</Link>
                <Link to="/signup" className="btn-primary !py-2 !px-5">Sign Up</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-gray-600 hover:text-indigo-500"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-2">
          <Link to="/" className="block py-2 text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <a href="#features" className="block py-2 text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#about" className="block py-2 text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>About</a>
          <hr className="border-gray-100" />
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="block py-2 text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
              <Link to="/profile" className="block py-2 text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
              <button onClick={handleLogout} className="block py-2 text-red-500 font-medium">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2 text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/signup" className="block py-2 text-indigo-500 font-medium" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
