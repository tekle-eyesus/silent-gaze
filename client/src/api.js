const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const API_URL = `${SERVER_URL}/api/chat`;


export const getMessages = async (roomId) => {
    try {
        const response = await fetch(`${API_URL}/${roomId}`);
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        return [];
    }
};