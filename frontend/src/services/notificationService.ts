import { apiRequest } from '@/utils/api';

const API_URL = '/notifications';

export const notificationApi = {
    getMyNotifications: async () => {
        const response = await apiRequest(API_URL);
        return response.json();
    },

    markAsRead: async (id: string) => {
        const response = await apiRequest(`${API_URL}/${id}/read`, {
            method: 'POST',
        });
        return response.json();
    },

    markAllAsRead: async () => {
        const response = await apiRequest(`${API_URL}/read-all`, {
            method: 'POST',
        });
        return response.json();
    }
};
