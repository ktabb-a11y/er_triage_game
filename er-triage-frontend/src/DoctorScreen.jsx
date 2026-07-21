import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { playSuccess } from './audio';

export default function DoctorScreen({ socket, player }) {
  const [treatmentStatus, setTreatmentStatus] = useState('idle'); // idle, treating, success
  const [pointsJustEarned, setPointsJustEarned] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [manualCode, setManualCode] = useState(''); // NEW

  useEffect(() => {
    socket.on('treatmentStarted', (data) => {
      setTreatmentStatus('treating');
      setTimeLeft(data.duration);
    });

    socket.on('treatmentComplete', (data) => {
      if (data) {
        playSuccess();
        setPointsJustEarned(data.pointsEarned);
        setTreatmentStatus('success');
        setTimeout(() => setTreatmentStatus('idle'), 3000);
      } else {
        setTreatmentStatus('idle');
      }
    });

    return () => {
      socket.off('treatmentStarted');
      socket.off('treatmentComplete');
    };
  }, [socket]);

  useEffect(() => {
    let timer;
    if (treatmentStatus === 'treating' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [treatmentStatus, timeLeft]);

  const handleScan = (result) => {
    if (!result) return;
    const text = Array.isArray(result) ? result[0].rawValue : result;
    if (text) socket.emit('startTreatment', text); 
  };

  // --- NEW: Handle manual code submission ---
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim().length > 0) {
      socket.emit('startTreatment', manualCode.trim());
      setManualCode('');
    }
  };

  if (treatmentStatus === 'treating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] bg-blue-900 text-white p-4 text-center">
        <h1 className="text-4xl font-black mb-4 uppercase tracking-widest animate-pulse">In Surgery</h1>
        <div className="text-9xl font-black my-8">{timeLeft}</div>
        <p className="text-xl font-bold text-blue-300">Keep your device awake!</p>
      </div>
    );
  }

  if (treatmentStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] bg-green-600 text-white p-4 text-center">
        <h1 className="text-5xl font-black mb-4 uppercase tracking-widest">Saved!</h1>
        <p className="text-3xl font-bold">+{pointsJustEarned} pts</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col bg-black min-h-[calc(100vh-3rem)] w-full">
      {/* HUD Overlays */}
      <div className="absolute top-4 right-4 z-40 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur-md">
        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Score:</span> 
        <span className="text-green-400 font-black text-xl ml-2">{player.score}</span>
      </div>

      <div className="absolute top-4 left-4 z-40 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur-md">
        <span className="text-slate-400 text-xs font-mono font-bold">ID: {player.id}</span>
      </div>

      {/* Fullscreen Camera */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <Scanner 
          onScan={handleScan}
          onError={(error) => console.log(error?.message)}
          components={{ tracker: true, audio: false }}
        />
        
        {/* Floating Manual Entry UI */}
        <div className="absolute bottom-6 w-full px-4 z-40 flex flex-col items-center pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-md border border-slate-600 text-white p-4 rounded-3xl shadow-2xl w-full max-w-sm">
            <p className="text-center text-sm font-bold tracking-widest uppercase mb-3 text-slate-300">Scan QR or Enter Code</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input 
                type="number" 
                placeholder="4-Digit Code" 
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-500 rounded-xl px-4 py-3 text-center text-xl font-black tracking-widest focus:outline-none focus:border-blue-500 placeholder-slate-500"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold uppercase tracking-wider">
                Treat
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}