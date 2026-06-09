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
  
  submitTest: async (id: number, answers: number[], timeSpent?: number) => {
    const response = await api.post(`/tests/${id}/submit`, { 
      answers, 
      time_spent: timeSpent 
    });
    return response.data;
  },

  getTestPaged: async (id: number, page: number = 1, limit: number = 5) => {
    const response = await api.get(`/tests/${id}/paged?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getTestAttempts: async (id: number) => {
    const response = await api.get(`/tests/${id}/attempts`);
    return response.data;
  },
  
  getAttemptDetails: async (testId: number, attemptId: number) => {
    const response = await api.get(`/tests/${testId}/attempt/${attemptId}`);
    return response.data;
  },
};
