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

  getTestPaged: async (id: number, page: number = 1, limit: number = 5) => {
    const response = await api.get(`/tests/${id}/paged?page=${page}&limit=${limit}`);
    return response.data;
},
};
