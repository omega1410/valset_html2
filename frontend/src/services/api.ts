import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Интерцептор для добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'Ошибка запроса';
    
    // Не показываем тосты для 401, так как там своя обработка
    if (error.response?.status !== 401) {
      toast.error(message);
    }
    
    console.error(`[API Error] ${error.config?.url}:`, message);
    return Promise.reject(error);
  }
);

export default api;