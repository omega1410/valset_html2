import api from './api';

export const aiService = {
  chat: async (message: string, mode: 'rag' | 'free' = 'rag') => {
    const response = await api.post('/ai/chat', { text: message, mode });
    return response.data;
  },
  
  getHistory: async () => {
    const response = await api.get('/ai/chat/history');
    return response.data;
  },
  
  clearHistory: async () => {
    const response = await api.delete('/ai/chat/history');
    return response.data;
  },
};