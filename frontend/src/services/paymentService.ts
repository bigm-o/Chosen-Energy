import { apiRequest } from '@/utils/api';

const API_URL = 'http://localhost:5100/api/payments';

export const paymentApi = {
    create: async (data: any) => {
        const response = await apiRequest(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    getByCustomer: async (customerId: string) => {
        const response = await apiRequest(`${API_URL}/customer/${customerId}`);
        return response.json();
    },

    getAll: async () => {
        const response = await apiRequest(API_URL);
        return response.json();
    }
};
