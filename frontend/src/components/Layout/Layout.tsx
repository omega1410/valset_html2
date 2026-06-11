import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { Breadcrumbs } from './Breadcrumbs';
import { useMobile } from '../../hooks/useMobile';

export const Layout = () => {
  const { user, isAdmin, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [iconSrc, setIconSrc] = useState('');

  // Скрываем кнопки на страницах логина и сброса пароля
  const hideButtons = location.pathname === '/reset-password' || location.pathname === '/login';

  useEffect(() => {
    const iconName = theme === 'light' ? 'icon-light.svg' : 'icon-dark.svg';
    setIconSrc(`/assets/${iconName}`);
  }, [theme]);

  const handleLogout = () => {
    logout();
    toast.success('Вы вышли из системы');
    navigate('/login');
  };

  const navLinks = [
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
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 transition-all duration-200">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Логотип */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
              {iconSrc && (
                <img 
                  src={iconSrc} 
                  alt="Logo" 
                  className="w-6 h-6 sm:w-7 sm:h-7"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="font-semibold text-lg sm:text-2xl text-slate-800 dark:text-white transition-colors duration-200">
                Hotel Assistant
              </span>
            </Link>

            {/* Десктопное меню */}
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
                  id="theme-toggle"
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200"
                  aria-label="Переключить тему"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                
                {/* Профиль */}
                <div className="relative">
                  <button
                    id="profile-button"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 focus:outline-none"
                  >
                    {user?.avatar ? (
                      <img
                        src={`/avatars/${user.avatar}`}
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
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 animate-fade-in-up">
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

            {/* Кнопка бургер-меню (мобилка) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
              aria-label="Меню"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Мобильное меню - слайдер */}
      {isMobileMenuOpen && (
        <>
          {/* Затемнение фона */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Слайдер-меню */}
          <div className="fixed top-0 right-0 h-full w-64 bg-white dark:bg-slate-800 shadow-xl z-50 transform transition-transform duration-300 translate-x-0 flex flex-col">
            <div className="flex justify-end p-4 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 py-3 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Админ-панель
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Мой профиль
                </Link>
                
                <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between py-3 px-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                  >
                    <span>{theme === 'light' ? '🌙 Тёмная тема' : '☀️ Светлая тема'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left py-3 px-2 text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                  >
                    Выйти
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Основной контент */}
      <main className={`container mx-auto px-4 sm:px-6 py-6 sm:py-8 ${!hideButtons && isMobile ? 'pb-28' : 'pb-8'}`}>
        <Breadcrumbs />
        <Outlet />
      </main>
    </div>
  );
};
