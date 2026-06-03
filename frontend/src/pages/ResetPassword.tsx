import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
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
        const response = await authService.resetPassword(token, newPassword);
        console.log('Ответ сервера:', response); // 👈 ДОБАВЬТЕ ЭТУ СТРОКУ
        
        if (response && response.message) {
        toast.success(response.message);
        } else {
        toast.success('Пароль успешно изменён');
        }
        
        // Перенаправляем через 2 секунды
        setTimeout(() => {
        navigate('/login');
        }, 2000);
        
    } catch (error: any) {
        console.error('Ошибка:', error); // 👈 ДОБАВЬТЕ ЭТУ СТРОКУ
        toast.error(error.response?.data?.detail || 'Ошибка');
    } finally {
        setLoading(false);
    }
    };

  if (!validToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-semibold text-white text-center mb-4">Ошибка</h1>
          <p className="text-white/70 text-center mb-6">Недействительная или просроченная ссылка</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-white/20 text-white py-2 rounded-lg hover:bg-white/30 transition"
          >
            Вернуться ко входу
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">Пароль изменён!</h1>
          <p className="text-white/70 mb-6">Теперь вы можете войти с новым паролем</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-white/20 text-white py-2 rounded-lg hover:bg-white/30 transition"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Сброс пароля</h1>
          <p className="text-white/70 text-sm mt-1">Введите новый пароль</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Новый пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50"
              placeholder="••••••"
              required
              minLength={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Подтвердите пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white/20 text-white py-2 rounded-lg hover:bg-white/30 transition disabled:opacity-50 font-medium"
          >
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-white/70 hover:text-white transition"
            >
              Вернуться ко входу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};