import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function DoctorScreen({ socket, player }) {
  const [treatmentStatus, setTreatmentStatus] = useState('idle'); // idle, treating, success
  const [pointsJustEarned, setPointsJustEarned] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    socket.on('treatmentStarted', (data) => {
      setTreatmentStatus('treating');
      setTimeLeft(data.duration);
    });

    socket.on('treatmentComplete', (data) => {
      if (data) {
        setPointsJustEarned(data.pointsEarned);
        setTreatmentStatus('success');
        setTimeout(() => setTreatmentStatus('idle'), 3000);
      } else {
        // If data is null, the patient died and the surgery was aborted
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

  // --- NEW: Handle the camera detecting a QR Code ---
  const handleScan = (result) => {
    if (!result) return;
    
    // The library API can return an array or a string depending on the exact version
    const text = Array.isArray(result) ? result[0].rawValue : result;
    
    if (text) {
      setIsScanning(false); // Close the camera overlay
      socket.emit('startTreatment', text); // Send the scanned ID to the server
    }
  };

  // STATE 1: Camera Scanner Overlay
  if (isScanning) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <Scanner 
            onScan={handleScan}
            onError={(error) => console.log(error?.message)}
            components={{ tracker: true, audio: false }}
          />
        </div>
        <div className="bg-slate-900 p-6 pb-12">
          <button 
            onClick={() => setIsScanning(false)}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl text-xl"
          >
            Cancel Scan
          </button>
        </div>
      </div>
    );
  }

  // STATE 2: Treating Patient
  if (treatmentStatus === 'treating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-900 text-white p-4 text-center">
        <h1 className="text-4xl font-black mb-4 uppercase tracking-widest animate-pulse">In Surgery</h1>
        <div className="text-9xl font-black my-8">{timeLeft}</div>
        <p className="text-xl font-bold text-blue-300">Keep your device awake!</p>
      </div>
    );
  }

  // STATE 3: Success Screen
  if (treatmentStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-600 text-white p-4 text-center">
        <h1 className="text-5xl font-black mb-4 uppercase tracking-widest">Saved!</h1>
        <p className="text-3xl font-bold">+{pointsJustEarned} pts</p>
      </div>
    );
  }

  // STATE 4: Idle / Ready to Scan
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="absolute top-4 right-4 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Score:</span> 
        <span className="text-green-400 font-black text-xl ml-2">{player.score}</span>
      </div>

      <h1 className="text-3xl font-bold mb-12 text-slate-300">Doctor on Call</h1>
      
      {/* --- NEW: Open Camera Button --- */}
      <button 
        onClick={() => setIsScanning(true)}
        className="bg-blue-600 text-white text-2xl font-black py-8 px-12 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.5)] hover:bg-blue-500 active:scale-95 transition-all flex flex-col items-center gap-2"
      >
        <span className="text-5xl mb-2">📷</span>
        SCAN PATIENT
      </button>

      <p className="mt-12 text-slate-500 text-center max-w-xs">
        Hurry to the patients and scan their QR codes before they flatline!
      </p>

      <p className="mt-8 text-slate-600 font-mono text-xs">My Doctor ID: {player.id}</p>
    </div>
  );
}