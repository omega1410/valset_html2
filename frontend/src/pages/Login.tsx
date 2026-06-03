import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Введите пароль'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Login = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await authService.login(data.email, data.password);
      
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
      }
      
      setAuth(response.access_token, {
        id: response.user_id,
        email: response.email,
        full_name: response.full_name,
        role: response.role,
        first_name: response.first_name,
        last_name: response.last_name,
        avatar: response.avatar,
        birthday: response.birthday,
      });
      
      toast.success('Добро пожаловать в систему');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Введите email');
      return;
    }
    
    setResetLoading(true);
    try {
      await authService.forgotPassword(resetEmail);
      toast.success('Инструкция отправлена на email');
      setForgotPasswordMode(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка');
    } finally {
      setResetLoading(false);
    }
  };

  if (forgotPasswordMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white">Сброс пароля</h1>
            <p className="text-white/70 text-sm mt-1">Введите email для восстановления</p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50"
                placeholder="example@hotel.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full bg-white/20 text-white py-2 rounded-lg hover:bg-white/30 transition disabled:opacity-50 font-medium backdrop-blur-sm"
            >
              {resetLoading ? 'Отправка...' : 'Отправить'}
            </button>

            <button
              type="button"
              onClick={() => setForgotPasswordMode(false)}
              className="w-full text-sm text-white/70 hover:text-white transition"
            >
              Вернуться ко входу
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      {/* Эффект стекла (liquid glass) */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          {/* Ваша иконка */}
          <img 
            src="/assets/icon-dark.svg" 
            alt="Hotel Assistant" 
            className="w-20 h-20 mx-auto mb-4 drop-shadow-lg"
          />
          <h1 className="text-2xl font-bold text-white">Hotel Assistant</h1>
          <p className="text-white/70 text-sm mt-1">Вход в систему</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50"
              placeholder="example@hotel.com"
            />
            {errors.email && <p className="text-red-300 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Пароль</label>
            <input
              type="password"
              {...register('password')}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-white placeholder-white/50"
              placeholder="••••••"
            />
            {errors.password && <p className="text-red-300 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white/20 text-white py-2 rounded-lg hover:bg-white/30 transition disabled:opacity-50 font-medium backdrop-blur-sm"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setForgotPasswordMode(true)}
              className="text-sm text-white/70 hover:text-white transition"
            >
              Забыли пароль?
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-white/30 text-center">
          <p className="text-xs text-white/50">Система адаптации сотрудников</p>
        </div>
      </div>
    </div>
  );
};