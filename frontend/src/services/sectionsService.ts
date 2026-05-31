import api from './api';

export const sectionsService = {
  getSections: async (page = 1, limit = 10) => {
    const response = await api.get(`/sections/?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getSection: async (id) => {
    const response = await api.get(`/sections/${id}`);
    return response.data;
  },
  
  searchSections: async (query) => {
    const response = await api.get(`/sections/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};