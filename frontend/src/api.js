import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';


const getUserHeader = () => {
    return { 'X-User-Name': localStorage.getItem('tedx_user') || 'Anonymous' };
};

export const getSpeakers = async (status = null) => {
    const params = status ? { status } : {};
    const response = await axios.get(`${API_URL}/speakers`, { params });
    return response.data;
};

export const updateSpeaker = async (id, data) => {
    const response = await axios.patch(`${API_URL}/speakers/${id}`, data, { headers: getUserHeader() });
    return response.data;
};

export const createSpeaker = async (data) => {
    const response = await axios.post(`${API_URL}/speakers`, data, { headers: getUserHeader() });
    return response.data;
};

// Existing exports...

export const generateEmail = async (id) => {
    const response = await axios.post(`${API_URL}/generate-email?speaker_id=${id}`);
    return response.data;
};

export const refineEmail = async (currentDraft, instruction) => {
    const response = await axios.post(`${API_URL}/refine-email`, {
        current_draft: JSON.stringify(currentDraft),
        instruction
    });
    return response.data;
};

export const exportSpeakers = () => {
    window.open(`${API_URL}/export/csv`, '_blank');
};

export const getLogs = async () => {
    const response = await axios.get(`${API_URL}/logs`);
    return response.data;
};

export const researchSpeaker = async (id) => {
    const response = await axios.post(`${API_URL}/research-speaker?speaker_id=${id}`, {}, { headers: getUserHeader() });
    return response.data;
};
