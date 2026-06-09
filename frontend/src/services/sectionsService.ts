import api from './api';

export const sectionsService = {
  getSections: async (page = 1, limit = 100) => {
    const response = await api.get(`/sections/?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getSection: async (id: number) => {
    const response = await api.get(`/sections/${id}`);
    return response.data;
  },
  
  searchSections: async (query: string) => {
    if (!query || query.length < 2) return []; // 👈 Добавить проверку
    const response = await api.get(`/sections/search?q=${encodeURIComponent(query)}`);
    return response.data; // API возвращает массив
  },
};
