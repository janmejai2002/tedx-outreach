import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create a base axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 60000 // 60s timeout for AI generation
});

// Request interceptor for attaching auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('tedx_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for handling errors globally (especially 401)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Token expired or unauthorized
            if (error.response.status === 401) {
                console.warn('Unauthorized! Logging out...');
                localStorage.removeItem('tedx_token');
                localStorage.removeItem('tedx_user');
                localStorage.removeItem('tedx_roll');
                window.location.reload(); // Force reload to trigger login redirect
            }

            // Rate limited
            if (error.response.status === 429) {
                alert('Too many requests. Please slow down.');
            }

            // Entity too large
            if (error.response.status === 413) {
                alert('File or request too large.');
            }
        }
        return Promise.reject(error);
    }
);

export const loginUser = async (rollNumber) => {
    const response = await api.post('/login', { roll_number: rollNumber });
    if (response.data.access_token) {
        localStorage.setItem('tedx_token', response.data.access_token);
        localStorage.setItem('tedx_user', response.data.user_name);
        localStorage.setItem('tedx_roll', response.data.roll_number);
    }
    return response.data;
};

export const getSpeakers = async (params = {}) => {
    const response = await api.get('/speakers', { params });
    return response.data;
};

export const updateSpeaker = async (id, data) => {
    const response = await api.patch(`/speakers/${id}`, data);
    return response.data;
};

export const createSpeaker = async (data) => {
    const response = await api.post('/speakers', data);
    return response.data;
};

export const deleteSpeaker = async (id) => {
    const response = await api.delete(`/speakers/${id}`);
    return response.data;
};

export const generateEmail = async (id) => {
    const response = await api.post(`/generate-email?speaker_id=${id}`);
    return response.data;
};

export const refineEmail = async (currentDraft, instruction) => {
    const response = await api.post('/refine-email', {
        current_draft: typeof currentDraft === 'string' ? currentDraft : JSON.stringify(currentDraft),
        instruction
    });
    return response.data;
};

export const exportSpeakers = () => {
    const token = localStorage.getItem('tedx_token');
    window.open(`${API_URL}/export/csv?token=${token}`, '_blank');
};

export const getLogs = async () => {
    const response = await api.get('/logs');
    return response.data;
};

export const getSpeakerLogs = async (speakerId) => {
    const response = await api.get(`/speakers/${speakerId}/logs`);
    return response.data;
};

export const assignSpeaker = async (speakerId, assignedTo) => {
    const response = await api.post(`/speakers/${speakerId}/assign?assigned_to=${assignedTo}`);
    return response.data;
};

export const unassignSpeaker = async (speakerId) => {
    const response = await api.post(`/speakers/${speakerId}/unassign`);
    return response.data;
};

export const getAuthorizedUsers = async () => {
    const response = await api.get('/admin/users');
    return response.data;
};

export const getAiPrompt = async (id) => {
    const response = await api.get(`/speakers/${id}/ai-prompt`);
    return response.data;
};

export const bulkUpdateSpeakers = async (data) => {
    const response = await api.patch('/speakers/bulk', data);
    return response.data;
};

export const bulkDeleteSpeakers = async (data) => {
    const response = await api.delete('/speakers/bulk', { data });
    return response.data;
};

// Sponsor APIs
export const getSponsors = async (params = {}) => {
    const response = await api.get('/sponsors', { params });
    return response.data;
};

export const createSponsor = async (data) => {
    const response = await api.post('/sponsors', data);
    return response.data;
};

export const updateSponsor = async (id, data) => {
    const response = await api.patch(`/sponsors/${id}`, data);
    return response.data;
};

export const generateSponsorEmail = async (id) => {
    const response = await api.post(`/generate-sponsor-email?sponsor_id=${id}`);
    return response.data;
};

// Creative APIs
export const getCreatives = async (params = {}) => {
    const response = await api.get('/creatives', { params });
    return response.data;
};

export const createCreative = async (data) => {
    const response = await api.post('/creatives', data);
    return response.data;
};

export const updateCreative = async (id, data) => {
    const response = await api.patch(`/creatives/${id}`, data);
    return response.data;
};

export const generateCreativeBrief = async (id) => {
    const response = await api.post(`/generate-creative-brief?asset_id=${id}`);
    return response.data;
};

// Admin roles
export const getAllUsers = async () => {
    const response = await api.get('/authorized-users');
    return response.data;
};

export const updateUserRole = async (rollNumber, data) => {
    const response = await api.patch(`/users/${rollNumber}`, data);
    return response.data;
};

// AI Ingestion
export const ingestAiData = async (rawText) => {
    const response = await api.post('/ingest-ai-data', { raw_text: rawText });
    return response.data;
};

// Creative Request System
export const getCreativeRequests = async () => {
    const response = await api.get('/creative-requests');
    return response.data;
};

export const createCreativeRequest = async (data) => {
    const response = await api.post('/creative-requests', data);
    return response.data;
};

export const updateCreativeRequest = async (id, data) => {
    const response = await api.patch(`/creative-requests/${id}`, data);
    return response.data;
};

// Gamification & User Sync
export const getMyDetails = async () => {
    const response = await api.get('/users/me');
    return response.data;
};

export const updateMyGamification = async (data) => {
    // data = { xp, streak, last_login_date }
    const response = await api.patch('/users/me/gamification', data);
    return response.data;
};

// Meta / Sprint
export const getSprintDeadline = async () => {
    const response = await api.get('/meta/sprint-deadline');
    return response.data;
};

export const updateSprintDeadline = async (data) => {
    const response = await api.post('/meta/sprint-deadline', data);
    return response.data;
};

export default api;
