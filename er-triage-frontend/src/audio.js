// src/audio.js
let audioCtx = null;
let heartbeatInterval = null;
let flatlineOsc = null;

// Browsers require a user action (like a click) to unlock audio.
export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const stopAudio = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (flatlineOsc) {
    try {
      flatlineOsc.stop();
      flatlineOsc.disconnect();
    } catch (e) {}
    flatlineOsc = null;
  }
};

export const playSuccess = () => {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
  osc.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.1); 
  
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime); 
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
};

export const playHeartbeat = (statusLevel) => {
  if (!audioCtx) return;
  stopAudio(); 
  
  const speedMs = Math.max(400, statusLevel * 60);

  const thump = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  };

  heartbeatInterval = setInterval(() => {
    thump(); 
    setTimeout(thump, 150); 
  }, speedMs);
};

// --- NEW: Softer, 3-Second Flatline ---
export const playFlatline = () => {
  if (!audioCtx) return;
  stopAudio();
  
  flatlineOsc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  flatlineOsc.connect(gain);
  gain.connect(audioCtx.destination);
  
  flatlineOsc.type = 'sine'; // Sine wave is much smoother than sawtooth
  flatlineOsc.frequency.setValueAtTime(800, audioCtx.currentTime); // Higher pitch
  
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime); // Much quieter
  
  flatlineOsc.start();
  flatlineOsc.stop(audioCtx.currentTime + 3); // Stops exactly after 3 seconds
  
  // Clean up the reference after it stops
  setTimeout(() => {
    if (flatlineOsc) flatlineOsc = null;
  }, 3000);
};