import api from './api';

export const testsService = {
  getTests: async () => {
    const response = await api.get('/tests/list');
    return response.data;
  },
  
  getTest: async (id: number) => {
    const response = await api.get(`/tests/${id}`);
    return response.data;
  },
  
  submitTest: async (id: number, answers: number[]) => {
    const response = await api.post(`/tests/${id}/submit`, { answers });
    return response.data;
  },
};