import api from './api';

export const testsAdminService = {
  // Тесты
  getTests: async () => {
    const response = await api.get('/admin/tests');
    return response.data;
  },
  
  getTest: async (id: number) => {
    const response = await api.get(`/admin/tests/${id}`);
    return response.data;
  },
  
  createTest: async (data: any) => {
    const response = await api.post('/admin/tests', data);
    return response.data;
  },
  
  updateTest: async (id: number, data: any) => {
    const response = await api.put(`/admin/tests/${id}`, data);
    return response.data;
  },
  
  deleteTest: async (id: number) => {
    const response = await api.delete(`/admin/tests/${id}`);
    return response.data;
  },
  
  // Вопросы
  addQuestion: async (data: any) => {
    const response = await api.post('/admin/questions', data);
    return response.data;
  },
  
  updateQuestion: async (id: number, data: any) => {
    const response = await api.put(`/admin/questions/${id}`, data);
    return response.data;
  },
  
  deleteQuestion: async (id: number) => {
    const response = await api.delete(`/admin/questions/${id}`);
    return response.data;
  },
  
  // Массовое создание (оставляем для совместимости)
  createTestBulk: async (data: any) => {
    const response = await api.post('/admin/tests/bulk', data);
    return response.data;
  },
};