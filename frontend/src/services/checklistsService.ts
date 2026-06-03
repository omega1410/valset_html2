import api from './api';

export const checklistsService = {
  getTypes: async () => {
    const response = await api.get('/checklists/types');
    return response.data;
  },
  
  getChecklist: async (shiftType: string) => {
    const response = await api.get(`/checklists/${shiftType}`);
    return response.data;
  },
  
  toggleTask: async (shiftType: string, taskId: number, isDone: boolean) => {
    const response = await api.post(`/checklists/${shiftType}/toggle`, { task_id: taskId, is_done: isDone });
    return response.data;
  },
  
  resetChecklist: async (shiftType: string) => {
    const response = await api.post(`/checklists/${shiftType}/reset`);
    return response.data;
  },
};