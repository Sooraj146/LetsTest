const API_BASE_URL = '/api';

const api = {
    async register(userData) {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Registration failed');
        return data;
    },

    async getQuestions() {
        const response = await fetch(`${API_BASE_URL}/questions`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch questions');
        return data;
    },

    async submitTest(submissionData) {
        const response = await fetch(`${API_BASE_URL}/users/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submissionData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Submission failed');
        return data;
    },

    async getResult(rollNumber) {
        const response = await fetch(`${API_BASE_URL}/users/result/${rollNumber}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch result');
        return data;
    },

    async getSettings() {
        const response = await fetch(`${API_BASE_URL}/users/settings`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch settings');
        return data;
    }
};
