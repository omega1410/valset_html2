import api from './api';

export const filesService = {
  getFiles: async () => {
    const response = await api.get('/files/list');
    return response.data;
  },
  
  // Для скачивания используем прямую ссылку без авторизации
  getDownloadUrl: (filename: string) => {
    return `/api/files/download/${filename}`;
  },
};
