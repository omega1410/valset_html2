import api from './api';

export interface LogEntry {
  id: number;
  room_number: string | null;
  task: string;
  assignee: string | null;
  author_id: number;
  author_name: string;
  comment: string | null;
  status: string;
  is_important: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export const logbookService = {
  getAll: async (status?: string, search?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const url = params.toString() ? `/logbook/?${params}` : '/logbook/';
    const response = await api.get(url);
    return response.data;
  },
  
  getMy: async () => {
    const response = await api.get('/logbook/my');
    return response.data;
  },
  
  getImportant: async () => {
    const response = await api.get('/logbook/important');
    return response.data;
  },
  
  getHistory: async (search?: string) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await api.get(`/logbook/history${params}`);
    return response.data;
  },
  
  create: async (data: { room_number?: string; task: string; assignee?: string; comment?: string; is_important?: boolean }) => {
    const response = await api.post('/logbook/', data);
    return response.data;
  },
  
  update: async (id: number, data: { room_number?: string; task?: string; assignee?: string; comment?: string; status?: string; is_important?: boolean }) => {
    const response = await api.put(`/logbook/${id}`, data);
    return response.data;
  },
  
  complete: async (id: number) => {
    const response = await api.post(`/logbook/${id}/complete`);
    return response.data;
  },
  
  toggleImportant: async (id: number) => {
    const response = await api.post(`/logbook/${id}/important`);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/logbook/${id}`);
    return response.data;
  },
  
  restore: async (id: number) => {
    const response = await api.post(`/logbook/${id}/restore`);
    return response.data;
  },
};
