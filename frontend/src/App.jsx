import React, { useEffect, useState } from 'react';
import Board from './components/Board';
import SponsorBoard from './components/SponsorBoard';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

import CreativeBoard from './components/CreativeBoard';

function App() {
  const [mode, setMode] = useState('speaker'); // 'speaker' | 'sponsor' | 'creatives'

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

    const interval = setInterval(pingBackend, 600000);
    pingBackend();

    return () => clearInterval(interval);
  }, []);

  if (mode === 'speaker') {
    return <Board onSwitchMode={(m) => setMode(m || 'sponsor')} />;
  } else if (mode === 'sponsor') {
    return <SponsorBoard onSwitchMode={(m) => setMode(m || 'creatives')} />;
  } else {
    return <CreativeBoard onSwitchMode={(m) => setMode(m || 'speaker')} />;
  }
}

export default App;
