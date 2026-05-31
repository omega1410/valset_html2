import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

export const Layout = () => {
  const { user, isAdmin, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [iconSrc, setIconSrc] = useState('');

  useEffect(() => {
    // Устанавливаем иконку в зависимости от темы
    const iconName = theme === 'light' ? 'icon-light.svg' : 'icon-dark.svg';
    setIconSrc(`http://localhost:8000/assets/${iconName}`);
  }, [theme]);

  const handleLogout = () => {
    logout();
    toast.success('Вы вышли из системы');
    navigate('/login');
  };

  const navLinks = [
    // { path: '/', label: 'Главная' },
    { path: '/sections', label: 'База знаний' },
    { path: '/tests', label: 'Тесты' },
    { path: '/checklists', label: 'Чек-листы' },
    { path: '/files', label: 'Документы' },
    { path: '/logbook', label: 'Логбук' },
  ];

  const getInitials = () => {
    const first = user?.first_name?.[0] || '';
    const last = user?.last_name?.[0] || '';
    return `${first}${last}`.toUpperCase() || user?.full_name?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 transition-all duration-200">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              {/* Иконка приложения */}
              {iconSrc && (
                <img 
                  src={iconSrc} 
                  alt="Logo" 
                  className="w-7 h-7"
                  onError={(e) => {
                    console.log('Иконка не загрузилась:', iconSrc);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="font-semibold text-xl text-slate-800 dark:text-white transition-colors duration-200">Hotel Assistant</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <div className="flex gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors duration-200"
                  >
                    Админ-панель
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-700 transition-colors duration-200">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                
                {/* Профиль с аватаром */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 focus:outline-none"
                  >
                    {user?.avatar ? (
                      <img
                        src={`http://localhost:8000/avatars/${user.avatar}`}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {getInitials()}
                      </div>
                    )}
                    <span className="text-sm text-slate-600 dark:text-slate-300 hidden lg:inline">{user?.full_name}</span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isProfileMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          Мой профиль
                        </Link>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            handleLogout();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          Выйти
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block text-slate-600 dark:text-slate-300 hover:text-blue-600"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="block text-amber-600 dark:text-amber-400 hover:text-amber-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Админ-панель
              </Link>
            )}
            <Link
              to="/profile"
              className="block text-slate-600 dark:text-slate-300 hover:text-blue-600"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Мой профиль
            </Link>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={toggleTheme}
                className="mr-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-700"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="text-red-600 dark:text-red-400"
              >
                Выйти
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};