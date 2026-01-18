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

export const getSpeakers = async (status = null) => {
    const params = status ? { status } : {};
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

export const researchSpeaker = async (id) => {
    const response = await axios.post(`${API_URL}/research-speaker?speaker_id=${id}`, {}, { headers: getAuthHeader() });
    return response.data;
};
