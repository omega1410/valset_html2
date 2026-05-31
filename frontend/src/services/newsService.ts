import api from './api';

export const newsService = {
  getNews: async () => {
    const response = await api.get('/news/');
    return response.data;
  },
  
  getAllNews: async () => {
    const response = await api.get('/news/all');
    return response.data;
  },
  
  createNews: async (data: { title: string; content: string }) => {
    const response = await api.post('/news/', data);
    return response.data;
  },
  
  updateNews: async (id: number, data: any) => {
    const response = await api.put(`/news/${id}`, data);
    return response.data;
  },
  
  deleteNews: async (id: number) => {
    const response = await api.delete(`/news/${id}`);
    return response.data;
  },
};