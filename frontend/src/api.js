import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeader = () => {
    const token = localStorage.getItem('tedx_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const loginUser = async (rollNumber) => {
    const response = await axios.post(`${API_URL}/login`, { roll_number: rollNumber });
    if (response.data.access_token) {
        localStorage.setItem('tedx_token', response.data.access_token);
        localStorage.setItem('tedx_user', response.data.user_name);
        localStorage.setItem('tedx_roll', response.data.roll_number);
    }
    return response.data;
};

export const getSpeakers = async (params = {}) => {
    const response = await axios.get(`${API_URL}/speakers`, {
        params,
        headers: getAuthHeader()
    });
    return response.data;
};

export const updateSpeaker = async (id, data) => {
    const response = await axios.patch(`${API_URL}/speakers/${id}`, data, { headers: getAuthHeader() });
    return response.data;
};

export const createSpeaker = async (data) => {
    const response = await axios.post(`${API_URL}/speakers`, data, { headers: getAuthHeader() });
    return response.data;
};

// Existing exports...

export const generateEmail = async (id) => {
    const response = await axios.post(`${API_URL}/generate-email?speaker_id=${id}`, {}, { headers: getAuthHeader() });
    return response.data;
};

export const refineEmail = async (currentDraft, instruction) => {
    const response = await axios.post(`${API_URL}/refine-email`, {
        current_draft: JSON.stringify(currentDraft),
        instruction
    }, { headers: getAuthHeader() });
    return response.data;
};

export const exportSpeakers = () => {
    window.open(`${API_URL}/export/csv`, '_blank');
};

export const getLogs = async () => {
    const response = await axios.get(`${API_URL}/logs`, { headers: getAuthHeader() });
    return response.data;
};

export const getSpeakerLogs = async (speakerId) => {
    const response = await axios.get(`${API_URL}/speakers/${speakerId}/logs`, { headers: getAuthHeader() });
    return response.data;
};

// Task Assignment APIs
export const assignSpeaker = async (speakerId, assignedTo) => {
    const response = await axios.post(
        `${API_URL}/speakers/${speakerId}/assign?assigned_to=${assignedTo}`,
        {},
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const unassignSpeaker = async (speakerId) => {
    const response = await axios.post(
        `${API_URL}/speakers/${speakerId}/unassign`,
        {},
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const getAuthorizedUsers = async () => {
    const response = await axios.get(
        `${API_URL}/admin/users`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

export const getAiPrompt = async (id) => {
    const response = await axios.get(`${API_URL}/speakers/${id}/ai-prompt`, { headers: getAuthHeader() });
    return response.data;
};

export const bulkUpdateSpeakers = async (data) => {
    const response = await axios.patch(`${API_URL}/speakers/bulk`, data, { headers: getAuthHeader() });
    return response.data;
};

// Sponsor APIs
export const getSponsors = async (params = {}) => {
    const response = await axios.get(`${API_URL}/sponsors`, {
        params,
        headers: getAuthHeader()
    });
    return response.data;
};

export const createSponsor = async (data) => {
    const response = await axios.post(`${API_URL}/sponsors`, data, { headers: getAuthHeader() });
    return response.data;
};

export const updateSponsor = async (id, data) => {
    const response = await axios.patch(`${API_URL}/sponsors/${id}`, data, { headers: getAuthHeader() });
    return response.data;
};

export const generateSponsorEmail = async (id) => {
    const response = await axios.post(`${API_URL}/generate-sponsor-email?sponsor_id=${id}`, {}, { headers: getAuthHeader() });
    return response.data;
};

// Creative APIs
export const getCreatives = async (params = {}) => {
    const response = await axios.get(`${API_URL}/creatives`, { params, headers: getAuthHeader() });
    return response.data;
};

export const createCreative = async (data) => {
    const response = await axios.post(`${API_URL}/creatives`, data, { headers: getAuthHeader() });
    return response.data;
};

export const updateCreative = async (id, data) => {
    const response = await axios.patch(`${API_URL}/creatives/${id}`, data, { headers: getAuthHeader() });
    return response.data;
};

export const generateCreativeBrief = async (id) => {
    const response = await axios.post(`${API_URL}/generate-creative-brief?asset_id=${id}`, {}, { headers: getAuthHeader() });
    return response.data;
};

// Admin roles
export const getAllUsers = async () => {
    const response = await axios.get(`${API_URL}/authorized-users`, { headers: getAuthHeader() });
    return response.data;
};

export const updateUserRole = async (rollNumber, data) => {
    const response = await axios.patch(`${API_URL}/users/${rollNumber}`, data, { headers: getAuthHeader() });
    return response.data;
};
