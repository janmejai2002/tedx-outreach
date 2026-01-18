import React, { useEffect } from 'react';
import Board from './components/Board';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  useEffect(() => {
    // Keep-alive pinger for Render Free Tier
    const pingBackend = async () => {
      try {
        await axios.get(`${API_URL}/healthz`);
        console.log("Pinger: Backend is awake.");
      } catch (e) {
        console.error("Pinger error", e);
      }
    };

    // Ping every 10 minutes (Render sleeps at 15 mins)
    const interval = setInterval(pingBackend, 600000);
    pingBackend(); // Initial ping

    return () => clearInterval(interval);
  }, []);

  return (
    <Board />
  );
}

export default App;
