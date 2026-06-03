import api from './api';

export const adminService = {
  // Разделы
  getSections: async () => {
    const response = await api.get('/admin/sections');
    return response.data;
  },
  
  getSection: async (id: number) => {
    const response = await api.get(`/admin/sections/${id}`);
    return response.data;
  },
  
  createSection: async (formData: FormData) => {
    const response = await api.post('/admin/sections', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  updateSection: async (id: number, title: string, content: string) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    const response = await api.put(`/admin/sections/${id}`, formData);
    return response.data;
  },
  
  addPhotos: async (id: number, photos: File[]) => {
    const formData = new FormData();
    photos.forEach(photo => {
      formData.append('photos', photo);
    });
    const response = await api.post(`/admin/sections/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  deletePhoto: async (id: number, slot: number) => {
    const response = await api.delete(`/admin/sections/${id}/photos/${slot}`);
    return response.data;
  },
  
  deleteSection: async (id: number) => {
    const response = await api.delete(`/admin/sections/${id}`);
    return response.data;
  },
  
  // Пользователи
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  
  createUser: async (data: any) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },
  
  deleteUser: async (id: number) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
  
  getFiles: async () => {
    const response = await api.get('/admin/files');
    return response.data;
  },

  uploadFile: async (formData: FormData) => {
    const response = await api.post('/admin/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteFile: async (filename: string) => {
    const response = await api.delete(`/admin/files/${filename}`);
    return response.data;
  },

  getChecklistTasks: async () => {
  const response = await api.get('/admin/checklists/tasks');
  return response.data;
  },

  createChecklistTask: async (data: any) => {
    const response = await api.post('/admin/checklists/tasks', data);
    return response.data;
  },

  updateChecklistTask: async (id: number, data: any) => {
    const response = await api.put(`/admin/checklists/tasks/${id}`, data);
    return response.data;
  },

  deleteChecklistTask: async (id: number) => {
    const response = await api.delete(`/admin/checklists/tasks/${id}`);
    return response.data;
  },

  resetDefaultChecklistTasks: async () => {
    const response = await api.post('/admin/checklists/reset-default');
    return response.data;
  },

  getNews: async () => {
  const response = await api.get('/admin/news');
  return response.data;
  },

  createNews: async (data: { title: string; content: string }) => {
    const response = await api.post('/admin/news', data);
    return response.data;
  },

  updateNews: async (id: number, data: { title?: string; content?: string; is_published?: boolean }) => {
    const response = await api.put(`/admin/news/${id}`, data);
    return response.data;
  },

  deleteNews: async (id: number) => {
    const response = await api.delete(`/admin/news/${id}`);
    return response.data;
  },

  reorderSections: async (sectionIds: number[]) => {
    const response = await api.post('/admin/sections/reorder', { section_ids: sectionIds });
    return response.data;
  },
};