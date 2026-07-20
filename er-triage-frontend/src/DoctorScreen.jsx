import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { playSuccess } from './audio';

export default function DoctorScreen({ socket, player }) {
  const [treatmentStatus, setTreatmentStatus] = useState('idle'); // idle, treating, success
  const [pointsJustEarned, setPointsJustEarned] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

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
        
        // Return to the live camera after 3 seconds
        setTimeout(() => setTreatmentStatus('idle'), 3000);
      } else {
        // If data is null, the patient died, instantly return to camera
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
    if (text) {
      socket.emit('startTreatment', text); 
    }
  };

  // STATE 1: Treating Patient
  if (treatmentStatus === 'treating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] bg-blue-900 text-white p-4 text-center">
        <h1 className="text-4xl font-black mb-4 uppercase tracking-widest animate-pulse">In Surgery</h1>
        <div className="text-9xl font-black my-8">{timeLeft}</div>
        <p className="text-xl font-bold text-blue-300">Keep your device awake!</p>
      </div>
    );
  }

  // STATE 2: Success Screen
  if (treatmentStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] bg-green-600 text-white p-4 text-center">
        <h1 className="text-5xl font-black mb-4 uppercase tracking-widest">Saved!</h1>
        <p className="text-3xl font-bold">+{pointsJustEarned} pts</p>
      </div>
    );
  }

  // STATE 3: Idle / Scanner Open By Default
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

      {/* Fullscreen Camera (Contained) */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <Scanner 
          onScan={handleScan}
          onError={(error) => console.log(error?.message)}
          components={{ tracker: true, audio: false }}
        />
        
        {/* Floating Instruction */}
        <div className="absolute bottom-12 w-full text-center pointer-events-none z-40">
          <div className="bg-black/60 backdrop-blur-md border border-slate-600 text-white inline-flex flex-col items-center px-8 py-4 rounded-3xl shadow-2xl">
            <span className="text-3xl mb-1">📷</span>
            <span className="font-black tracking-widest uppercase text-lg">Scan Patient QR</span>
          </div>
        </div>
      </div>
    </div>
  );
}