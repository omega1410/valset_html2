import api from './api';

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  updateProfile: async (data: { first_name?: string; last_name?: string }) => {
    const response = await api.put('/auth/me', data);
    return response.data;
  },
  
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  deleteAvatar: async () => {
    const response = await api.delete('/auth/me/avatar');
    return response.data;
  },
  
  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', null, { params: { email } });
    return response.data;
  },
  
  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', null, { 
      params: { token, new_password: newPassword } 
    });
    console.log('resetPassword response:', response); // 👈 ДОБАВЬТЕ
    return response.data;
  },
};