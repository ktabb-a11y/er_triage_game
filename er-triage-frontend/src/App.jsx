import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PatientScreen from './PatientScreen';
import DoctorScreen from './DoctorScreen';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const socket = io(backendUrl);

const GlobalTimer = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calcTime = () => Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    setTimeLeft(calcTime());
    const timer = setInterval(() => setTimeLeft(calcTime()), 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const isUrgent = timeLeft > 0 && timeLeft <= 30;

  return (
    <div className={`fixed top-0 left-0 right-0 py-2 z-50 shadow-md font-mono text-2xl font-black text-center text-white transition-colors duration-500 ${isUrgent ? 'bg-red-600 animate-pulse' : 'bg-slate-900/95 border-b border-slate-700'}`}>
      ⏱ {m}:{s.toString().padStart(2, '0')}
    </div>
  );
};

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [gameNameInput, setGameNameInput] = useState('');
  
  const [viewMode, setViewMode] = useState('menu'); 
  const [availableGames, setAvailableGames] = useState([]);
  
  const [gameState, setGameState] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [endGameStats, setEndGameStats] = useState(null); 

  useEffect(() => {
    socket.on('connect', () => setMyPlayerId(socket.id));
    
    socket.on('availableGamesList', (gamesList) => setAvailableGames(gamesList));

    socket.on('joinedLobby', (state) => {
      setGameState(state);
      setViewMode('lobby');
      setEndGameStats(null);
    });

    socket.on('updatePlayers', (players) => setGameState(prev => ({ ...prev, players })));
    socket.on('rolesAssigned', (players) => setGameState(prev => ({ ...prev, players })));
    socket.on('settingsUpdated', (settings) => setGameState(prev => ({ ...prev, settings })));
    socket.on('gameStarted', (state) => setGameState(state));
    socket.on('tickUpdate', (state) => setGameState(state));
    socket.on('scoreUpdate', (players) => setGameState(prev => ({ ...prev, players })));
    
    socket.on('gameEnded', (finalData) => {
      setGameState(prev => ({ ...prev, isGameRunning: false }));
      setEndGameStats(finalData);
    });

    socket.on('returnedToLobby', () => {
      setEndGameStats(null); 
      setGameState(prev => {
        const resetPlayers = {};
        Object.values(prev.players).forEach(p => resetPlayers[p.id] = { ...p, role: 'unassigned', score: 0 });
        return { ...prev, players: resetPlayers, endTime: null };
      });
    });

    // --- NEW: Handle the room being destroyed ---
    socket.on('gameDestroyed', (msg) => {
      alert(msg);
      setGameState(null);
      setEndGameStats(null);
      setViewMode('menu');
    });

    socket.on('errorMsg', (msg) => alert(msg));

    return () => socket.removeAllListeners();
  }, []);

  // --- ACTIONS ---
  const handleCreateGame = () => {
    if (playerName.trim() && gameNameInput.trim()) {
      socket.emit('createGame', { playerName, gameName: gameNameInput });
    }
  };

  const handleJoinSpecificGame = (selectedGame) => {
    if (playerName.trim()) {
      socket.emit('joinGame', { playerName, gameName: selectedGame });
    }
  };

  const fetchGamesAndGoToJoin = () => {
    if (!playerName.trim()) return alert("Please enter your name first!");
    socket.emit('getAvailableGames');
    setViewMode('join');
  };

  const handleLeaveLobby = () => {
    socket.emit('leaveGame');
    setGameState(null);
    setEndGameStats(null);
    setViewMode('menu');
  };

  // --- UI: LOGIN & MENUS ---
  if (viewMode !== 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
        <h1 className="text-4xl font-bold mb-8">🏥 ER Triage</h1>
        
        {viewMode === 'menu' && (
          <>
            <input 
              className="px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 placeholder-slate-400 w-full max-w-xs mb-4 focus:outline-none focus:border-blue-500"
              placeholder="Enter your name" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)} 
            />
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-lg font-bold" onClick={() => {
                if (playerName.trim()) setViewMode('create');
                else alert("Please enter your name first!");
              }}>Create New Game</button>
              <button className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-bold" onClick={fetchGamesAndGoToJoin}>Join Existing Game</button>
            </div>
          </>
        )}

        {viewMode === 'create' && (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <h2 className="text-xl font-bold text-center text-purple-400 mb-2">Create Room</h2>
            <input 
              className="px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 placeholder-slate-400 w-full focus:outline-none focus:border-purple-500"
              placeholder="Enter Room Name" 
              value={gameNameInput} 
              onChange={(e) => setGameNameInput(e.target.value)} 
            />
            <button className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-lg font-bold mt-2" onClick={handleCreateGame}>Create & Join</button>
            <button className="text-slate-400 mt-4 underline text-sm" onClick={() => setViewMode('menu')}>Cancel</button>
          </div>
        )}

        {viewMode === 'join' && (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <h2 className="text-xl font-bold text-center text-blue-400 mb-2">Join a Room</h2>
            {availableGames.length === 0 ? (
              <p className="text-slate-400 italic bg-slate-800 p-4 rounded-lg w-full text-center">No games available right now.</p>
            ) : (
              <ul className="w-full flex flex-col gap-2">
                {availableGames.map(game => (
                  <li key={game}>
                    <button 
                      onClick={() => handleJoinSpecificGame(game)}
                      className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 p-4 rounded-lg font-bold text-left flex justify-between items-center"
                    >
                      {game} <span className="text-blue-400 text-sm">Join &rarr;</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button className="text-slate-400 mt-6 underline text-sm" onClick={() => setViewMode('menu')}>Cancel</button>
          </div>
        )}
      </div>
    );
  }

  // --- UI: LOBBY & IN-GAME DESTRUCTURE ---
  const myPlayerData = gameState?.players ? Object.values(gameState.players).find(p => p.id === myPlayerId) : null;
  const isHost = gameState?.hostId === myPlayerId;
  const allPlayers = Object.values(gameState?.players || {});
  const hasUnassignedPlayers = allPlayers.some(p => p.role === 'unassigned');

  // --- END GAME SCOREBOARD ---
  if (endGameStats) {
    return (
      <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-6 pt-12">
        <h1 className="text-5xl font-black text-blue-400 mb-8 uppercase tracking-widest text-center">Shift Over</h1>
        <div className="w-full max-w-md bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl flex flex-col gap-6">
          <div className="text-center p-4 bg-slate-900 rounded-xl">
            <h3 className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-1">Total Points</h3>
            <p className="text-6xl font-black text-green-400">{endGameStats.totalPoints}</p>
          </div>
          <div className="flex justify-between gap-4">
             <div className="flex-1 text-center p-4 bg-slate-900 rounded-xl">
                <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Saved</h3>
                <p className="text-4xl font-black text-blue-400">{endGameStats.stats.saved}</p>
             </div>
             <div className="flex-1 text-center p-4 bg-slate-900 rounded-xl">
                <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Lost</h3>
                <p className="text-4xl font-black text-red-500">{endGameStats.stats.deaths}</p>
             </div>
          </div>
          <div className="mt-4">
             <h3 className="text-center text-slate-400 font-bold uppercase mb-2">Doctor Leaderboard</h3>
             <ul className="space-y-2">
               {Object.values(endGameStats.players).filter(p => p.role === 'doctor').sort((a, b) => b.score - a.score).map((doc, idx) => (
                   <li key={doc.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded">
                     <span className="font-bold">{idx + 1}. {doc.name}</span><span className="text-green-400 font-bold">{doc.score} pts</span>
                   </li>
               ))}
             </ul>
          </div>
        </div>
        {isHost ? (
          <button onClick={() => socket.emit('returnToLobby')} className="mt-8 bg-purple-600 px-8 py-4 rounded-full font-bold text-xl hover:bg-purple-500 shadow-lg">Return to Lobby</button>
        ) : (
          <p className="mt-8 text-slate-400 animate-pulse">Waiting for host to return to lobby...</p>
        )}
      </div>
    );
  }

  // --- WAITING ROOM ---
  if (!gameState?.isGameRunning) {
    return (
      <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-4">
        <h2 className="text-2xl font-bold mt-4">Room: {gameState.gameName}</h2>
        <p className="text-slate-400 mt-2">Players connected: {allPlayers.length}</p>
        <p className="text-slate-500 font-mono text-xs mt-1">My ID: {myPlayerId}</p>
        
        {myPlayerData?.role && myPlayerData.role !== 'unassigned' && (
          <div className="mt-6 text-xl bg-slate-800 p-4 rounded-xl border border-slate-700">Your Role: <span className="font-bold text-yellow-400 uppercase">{myPlayerData.role}</span></div>
        )}
        
        {isHost ? (
          <div className="mt-6 border-2 border-purple-600 bg-purple-900/20 p-6 rounded-xl flex flex-col gap-4 w-full max-w-sm">
            <h3 className="text-lg text-purple-300 text-center uppercase tracking-widest font-bold">Host Controls</h3>
            <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-lg border border-slate-700">
              <label className="text-sm font-bold text-slate-300">Round Duration (mins)</label>
              <input type="number" min="1" max="15" value={gameState.settings.durationMinutes} onChange={(e) => socket.emit('updateDuration', parseInt(e.target.value) || 3)} className="w-16 bg-slate-700 text-white rounded p-1 text-center font-bold"/>
            </div>
            <div className="bg-slate-900/80 rounded-lg p-3 max-h-48 overflow-y-auto border border-slate-700">
              <h4 className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider border-b border-slate-700 pb-1">Lobby Roster</h4>
              <ul className="space-y-2 text-sm">
                {allPlayers.map(p => (
                  <li key={p.id} className="flex justify-between items-center"><span className="font-medium">{p.name} {p.id === gameState.hostId && '👑'}</span>{p.role !== 'unassigned' && <span className={`text-xs font-bold uppercase ${p.role === 'doctor' ? 'text-blue-400' : 'text-orange-400'}`}>{p.role}</span>}</li>
                ))}
              </ul>
            </div>
            <button 
              className="bg-purple-600 hover:bg-purple-500 px-4 py-3 rounded font-bold transition-colors" 
              onClick={() => socket.emit('assignRoles')}
            >
              1. Assign Roles
            </button>
            
            {/* UPDATED: Start Game button with validation */}
            <button 
              className={`px-4 py-3 rounded font-bold transition-colors ${hasUnassignedPlayers ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`} 
              onClick={() => {
                if (hasUnassignedPlayers) {
                  alert("You must assign roles to all players before starting!");
                } else {
                  socket.emit('startGame');
                }
              }}
            >
              2. Start Game
            </button>
          </div>
        ) : (
          <div className="mt-12 flex flex-col items-center">
            <p className="text-slate-400 italic animate-pulse">Waiting for the host to start the game...</p>
            <p className="mt-4 text-sm text-slate-500 font-bold bg-slate-800 px-4 py-2 rounded-full">Round Time: {gameState?.settings?.durationMinutes} mins</p>
          </div>
        )}

        {/* --- NEW: LEAVE ROOM BUTTON --- */}
        <button 
          onClick={handleLeaveLobby} 
          className="mt-12 text-slate-500 hover:text-slate-300 underline font-bold"
        >
          {isHost ? 'Destroy Room & Leave' : 'Leave Room'}
        </button>

      </div>
    );
  }

  // --- ACTIVE GAME DECK ---
  return (
    <div className="relative pt-12">
      <GlobalTimer endTime={gameState.endTime} />
      {myPlayerData?.role === 'patient' && <PatientScreen socket={socket} player={myPlayerData} />}
      {myPlayerData?.role === 'doctor' && <DoctorScreen socket={socket} player={myPlayerData} />}

      {isHost && (
        <div className="bg-slate-900 border-t-8 border-purple-600 p-6 text-white w-full shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <h2 className="text-2xl font-black text-purple-400 mb-6 uppercase tracking-widest text-center flex flex-col items-center">
            <span>Host Dashboard</span><span className="text-xs text-slate-400 font-normal mt-1">(Scroll down to monitor)</span>
          </h2>
          <div className="flex justify-center mb-8">
            <button onClick={() => window.confirm('End round early?') && socket.emit('endGameEarly')} className="bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-full border-2 border-red-900 shadow-lg transition-transform active:scale-95 flex items-center gap-2">
              <span>🛑</span> End Round Early
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-blue-400 mb-3 uppercase tracking-wider border-b border-slate-700 pb-2">Doctors</h3>
              <ul className="space-y-2">
                {allPlayers.filter(p => p.role === 'doctor').map(d => (
                  <li key={d.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded"><span className="font-bold">{d.name} {d.id === gameState.hostId && '👑'}</span><span className="text-green-400 font-black">{d.score} pts</span></li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-orange-400 mb-3 uppercase tracking-wider border-b border-slate-700 pb-2 flex justify-between"><span>Patients</span><span className="text-red-400 text-sm">Deaths: {gameState.stats.deaths}</span></h3>
              <ul className="space-y-2">
                {allPlayers.filter(p => p.role === 'patient').map(p => {
                    const status = p.currentAilment ? p.currentAilment.statusLevel : 0;
                    const isDead = status === 0;
                    return (
                      <li key={p.id} className={`flex justify-between items-center p-3 rounded ${isDead ? 'bg-red-900/50 text-red-300' : 'bg-slate-700/50'}`}>
                        <span className="font-bold">{p.name} {p.id === gameState.hostId && '👑'}</span>
                        <span className="text-sm font-medium flex items-center gap-2">
                          {isDead ? <span>💀 Flatlined</span> : <><span>Level {status}</span>{p.isBeingTreated && <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full uppercase animate-pulse">In Surgery</span>}</>}
                        </span>
                      </li>
                    )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}