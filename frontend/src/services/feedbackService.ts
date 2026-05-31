import api from './api';

export const feedbackService = {
  sendFeedback: async (data: { subject: string; message: string; type: string }) => {
    const response = await api.post('/feedback/feedback', data);
    return response.data;
  },
};