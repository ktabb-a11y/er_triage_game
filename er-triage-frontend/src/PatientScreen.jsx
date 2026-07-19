import QRCode from 'react-qr-code';
import { useState, useEffect } from 'react';
import { playHeartbeat, playFlatline, stopAudio } from './audio';

export default function PatientScreen({ socket, player }) {
  const ailment = player.currentAilment;
  const [respawnTimeLeft, setRespawnTimeLeft] = useState(0);
  const [surgeryTimeLeft, setSurgeryTimeLeft] = useState(0);

  // Countdown timer for respawning
  useEffect(() => {
    if (player.respawnTime) {
      const updateTimer = () => setRespawnTimeLeft(Math.max(0, Math.ceil((player.respawnTime - Date.now()) / 1000)));
      updateTimer();
      const timer = setInterval(updateTimer, 500);
      return () => clearInterval(timer);
    }
  }, [player.respawnTime]);

  // NEW: Countdown timer for active surgery
  useEffect(() => {
    if (player.isBeingTreated && player.treatmentEndTime) {
      const updateSurgeryTimer = () => setSurgeryTimeLeft(Math.max(0, Math.ceil((player.treatmentEndTime - Date.now()) / 1000)));
      updateSurgeryTimer();
      const timer = setInterval(updateSurgeryTimer, 500);
      return () => clearInterval(timer);
    }
  }, [player.isBeingTreated, player.treatmentEndTime]);

  useEffect(() => {
    if (!ailment) {
      stopAudio(); // Stop sound if waiting/cured
    } else if (ailment.statusLevel === 0) {
      playFlatline(); // Beep on death
    } else if (ailment.statusLevel > 0) {
      playHeartbeat(ailment.statusLevel); // Thump based on health
    }

    // Cleanup if the component unmounts
    return () => stopAudio();
  }, [ailment?.statusLevel]);

  if (!ailment && player.respawnTime) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-700 text-white p-4 text-center">
        <h1 className="text-5xl font-black mb-4">CURED!</h1>
        <p className="text-xl">You survived! Take a breath.</p>
        <p className="mt-12 text-2xl font-bold">Next ailment in: <span className="text-5xl block mt-2">{respawnTimeLeft}s</span></p>
      </div>
    );
  }

  if (!ailment) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white p-4">Awaiting Ailment...</div>;
  }
  
  if (ailment.statusLevel === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-900 text-white p-4 text-center">
        <h1 className="text-5xl font-black mb-4">FLATLINED</h1>
        <p className="text-xl">You didn't make it.</p>
        {player.respawnTime && (
          <p className="mt-12 text-2xl font-bold animate-pulse text-red-300">
            Respawning in: <span className="text-5xl block mt-2 text-white">{respawnTimeLeft}s</span>
          </p>
        )}
      </div>
    );
  }

// Determine the background color dynamically based on the 1-20 scale
  let bgColorClass = 'bg-green-600'; // Default stable (17-20)
  if (ailment.statusLevel <= 2) bgColorClass = 'bg-red-800 animate-pulse';
  else if (ailment.statusLevel <= 4) bgColorClass = 'bg-red-700';
  else if (ailment.statusLevel <= 8) bgColorClass = 'bg-red-500';
  else if (ailment.statusLevel <= 12) bgColorClass = 'bg-orange-500';
  else if (ailment.statusLevel <= 16) bgColorClass = 'bg-yellow-500';

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${bgColorClass} text-white p-4 transition-colors duration-500`}>
      <h2 className="text-3xl font-bold uppercase tracking-wide text-center">{ailment.description}</h2>
      
      <div className="bg-white p-4 rounded-xl mt-8 shadow-2xl flex flex-col items-center">
        <QRCode value={player.id} size={200} />
        <p className="mt-4 text-slate-400 font-mono text-xs font-bold">ID: {player.id}</p>
      </div>
      
      <div className="mt-8 text-center bg-black/30 p-4 rounded-lg w-full max-w-xs">
        <p className="text-lg">Status Level: <span className="font-bold text-2xl">{ailment.statusLevel}</span></p>
        <p className="text-sm mt-2">Treatment Time: {ailment.treatmentTime}s</p>
        <p className="text-sm">Reward: {ailment.basePoints} pts</p>
      </div>

      {player.isBeingTreated && (
        <div className="absolute inset-0 bg-blue-900/95 flex flex-col items-center justify-center z-50">
          <h2 className="text-4xl font-bold animate-bounce text-center uppercase tracking-widest text-blue-300">In Surgery</h2>
          <div className="text-8xl font-black text-white my-8">{surgeryTimeLeft}s</div>
          <p className="mt-4 font-bold text-xl animate-pulse text-red-300">Hope the doctor is fast...</p>
        </div>
      )}
    </div>
  );
}