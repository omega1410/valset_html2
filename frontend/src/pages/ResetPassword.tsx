import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidToken(false);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    
    if (newPassword.length < 4) {
      toast.error('Пароль должен быть не менее 4 символов');
      return;
    }
    
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/reset-password?token=${token}&new_password=${newPassword}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка');
      }
      
      toast.success('Пароль успешно изменён');
      setSubmitted(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-600 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Ошибка</h1>
              <p className="text-white/70 text-sm mb-6">Недействительная или просроченная ссылка</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-white/20 text-white py-2 rounded-lg hover:bg-white/30 transition font-medium"
              >
                Вернуться ко входу
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-600 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center">
            <div className="w-16 h-16 bg-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Пароль изменён!</h1>
            <p className="text-white/70 text-sm mb-6">Теперь вы можете войти с новым паролем</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-white/20 text-white py-2 rounded-lg hover:bg-white/30 transition font-medium"
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-600 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Сброс пароля</h1>
            <p className="text-white/70 text-xs sm:text-sm mt-1">Введите новый пароль</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Новый пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50 text-base pr-12"
                  placeholder="Введите новый пароль"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-white/50 text-xs mt-1">Минимум 4 символа</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Подтвердите пароль</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50 text-base pr-12"
                  placeholder="Подтвердите пароль"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white/20 text-white py-3 rounded-lg hover:bg-white/30 transition disabled:opacity-50 font-medium text-base mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Сохранение...
                </div>
              ) : (
                'Сохранить пароль'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-white/70 hover:text-white transition"
              >
                ← Вернуться ко входу
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
