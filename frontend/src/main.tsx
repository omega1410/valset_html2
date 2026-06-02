import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // 👈 ДОБАВИТЬ

// Создаем клиент с настройками кэширования
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут данные считаются свежими
      gcTime: 10 * 60 * 1000,   // 10 минут храним в кэше
      refetchOnWindowFocus: false, // не перезагружать при фокусе окна
      retry: 1, // при ошибке повтор 1 раз
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>  {/* 👈 ОБЕРНУТЬ */}
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);