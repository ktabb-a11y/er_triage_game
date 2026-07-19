import { useState, useEffect } from 'react';

export default function DoctorScreen({ socket, player }) {
  const [treatingPatient, setTreatingPatient] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    socket.on('treatmentStarted', ({ duration }) => {
      setTreatingPatient(true);
      setTimeLeft(duration);
    });

    socket.on('treatmentComplete', () => {
      setTreatingPatient(false);
    });

    socket.on('errorMsg', (msg) => alert(msg));

    // Cleanup listeners when component unmounts
    return () => {
      socket.off('treatmentStarted');
      socket.off('treatmentComplete');
      socket.off('errorMsg');
    };
  }, [socket]);

  useEffect(() => {
    let timer;
    if (treatingPatient && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [treatingPatient, timeLeft]);

  const mockScan = () => {
    const id = prompt("Enter Patient's Socket ID (Check your backend terminal):");
    if (id) socket.emit('startTreatment', id);
  };

  if (treatingPatient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-600 text-white p-4">
        <h2 className="text-3xl font-bold mb-4 animate-pulse">Treating Patient...</h2>
        <div className="text-8xl font-black">{timeLeft}</div>
        <p className="mt-4">Keep your app open!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-900">
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
        <h2 className="font-bold text-xl text-blue-400">Doctor {player.name}</h2>
        <div className="font-black text-2xl text-green-400">{player.score} <span className="text-sm text-slate-400 font-normal">pts</span></div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm aspect-square bg-slate-300 border-4 border-dashed border-slate-400 rounded-2xl flex items-center justify-center shadow-inner relative">
          <p className="text-slate-500 font-bold text-center px-4">
            [Camera Viewfinder Placeholder]
          </p>
        </div>

        <button 
          onClick={mockScan}
          className="mt-8 bg-blue-600 text-white text-xl font-bold py-4 px-8 rounded-full shadow-lg hover:bg-blue-500 active:scale-95 transition-transform"
        >
          Mock Scan Patient
        </button>
        
        {/* NEW: Debug ID */}
        <p className="mt-8 text-slate-400 font-mono text-xs">My Doctor ID: {player.id}</p>
      </div>
    </div>
  );
}