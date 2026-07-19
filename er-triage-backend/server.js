const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const games = {}; 
const socketRooms = {}; 

const ailmentsDB = [
  // --- LEVELS 17-20: MINOR (Times: 3-4s | Chance: 0.2 - 0.25) ---
  { id: 'a1', description: 'Paper Cut', basePoints: 10, treatmentTime: 3, statusLevel: 20, deteriorationChance: 0.2 },
  { id: 'a2', description: 'Stubbed Toe', basePoints: 10, treatmentTime: 3, statusLevel: 20, deteriorationChance: 0.2 },
  { id: 'a3', description: 'Splinter', basePoints: 15, treatmentTime: 3, statusLevel: 19, deteriorationChance: 0.2 },
  { id: 'a4', description: 'Mild Sunburn', basePoints: 15, treatmentTime: 4, statusLevel: 18, deteriorationChance: 0.25 },
  { id: 'a5', description: 'Bee Sting', basePoints: 20, treatmentTime: 4, statusLevel: 17, deteriorationChance: 0.25 },
  { id: 'a6', description: 'Poison Ivy', basePoints: 20, treatmentTime: 4, statusLevel: 17, deteriorationChance: 0.25 },

  // --- LEVELS 13-16: MILD (Times: 4-6s | Chance: 0.3 - 0.4) ---
  { id: 'a7', description: 'Dislocated Finger', basePoints: 40, treatmentTime: 4, statusLevel: 16, deteriorationChance: 0.3 }, 
  { id: 'a8', description: 'Nosebleed', basePoints: 30, treatmentTime: 5, statusLevel: 15, deteriorationChance: 0.3 },
  { id: 'a9', description: 'Sprained Ankle', basePoints: 35, treatmentTime: 5, statusLevel: 14, deteriorationChance: 0.35 },
  { id: 'a10', description: 'Twisted Wrist', basePoints: 35, treatmentTime: 5, statusLevel: 14, deteriorationChance: 0.35 },
  { id: 'a11', description: 'Strep Throat', basePoints: 40, treatmentTime: 6, statusLevel: 13, deteriorationChance: 0.4 },
  { id: 'a12', description: 'Mild Concussion', basePoints: 45, treatmentTime: 6, statusLevel: 13, deteriorationChance: 0.4 },

  // --- LEVELS 9-12: MODERATE (Times: 6-8s | Chance: 0.45 - 0.55) ---
  { id: 'a13', description: 'Mild Allergic Reaction', basePoints: 50, treatmentTime: 6, statusLevel: 12, deteriorationChance: 0.45 },
  { id: 'a14', description: 'Broken Arm', basePoints: 50, treatmentTime: 7, statusLevel: 11, deteriorationChance: 0.45 },
  { id: 'a15', description: 'Second Degree Burn', basePoints: 55, treatmentTime: 7, statusLevel: 10, deteriorationChance: 0.5 },
  { id: 'a16', description: 'Deep Laceration', basePoints: 55, treatmentTime: 7, statusLevel: 10, deteriorationChance: 0.5 },
  { id: 'a17', description: 'Kidney Stones', basePoints: 65, treatmentTime: 8, statusLevel: 9, deteriorationChance: 0.55 },
  { id: 'a18', description: 'Broken Femur', basePoints: 60, treatmentTime: 8, statusLevel: 9, deteriorationChance: 0.55 },

  // --- LEVELS 5-8: SEVERE (Times: 8-9s | Chance: 0.6 - 0.7) ---
  { id: 'a19', description: 'Severe Asthma Attack', basePoints: 75, treatmentTime: 8, statusLevel: 8, deteriorationChance: 0.6 }, 
  { id: 'a20', description: 'Snake Bite', basePoints: 85, treatmentTime: 8, statusLevel: 7, deteriorationChance: 0.6 },
  { id: 'a21', description: 'Severe Food Poisoning', basePoints: 80, treatmentTime: 9, statusLevel: 7, deteriorationChance: 0.65 },
  { id: 'a22', description: 'Appendicitis', basePoints: 80, treatmentTime: 9, statusLevel: 6, deteriorationChance: 0.65 },
  { id: 'a23', description: 'Internal Bleeding', basePoints: 95, treatmentTime: 9, statusLevel: 5, deteriorationChance: 0.7 },
  { id: 'a24', description: 'Gunshot Wound', basePoints: 90, treatmentTime: 9, statusLevel: 5, deteriorationChance: 0.7 },

  // --- LEVELS 3-4: CRITICAL (Times: 10s | Chance: 0.75 - 0.8) ---
  { id: 'a25', description: 'Punctured Lung', basePoints: 120, treatmentTime: 10, statusLevel: 4, deteriorationChance: 0.75 }, 
  { id: 'a26', description: 'Sepsis', basePoints: 110, treatmentTime: 10, statusLevel: 4, deteriorationChance: 0.75 },
  { id: 'a27', description: 'Third Degree Burns', basePoints: 115, treatmentTime: 10, statusLevel: 3, deteriorationChance: 0.75 },
  { id: 'a28', description: 'Massive Stroke', basePoints: 130, treatmentTime: 10, statusLevel: 3, deteriorationChance: 0.8 },
  { id: 'a29', description: 'Traumatic Brain Injury', basePoints: 140, treatmentTime: 10, statusLevel: 3, deteriorationChance: 0.8 },
  { id: 'a30', description: 'Cardiac Arrest', basePoints: 150, treatmentTime: 10, statusLevel: 3, deteriorationChance: 0.8 }
];

function getRandomAilment() {
  return JSON.parse(JSON.stringify(ailmentsDB[Math.floor(Math.random() * ailmentsDB.length)])); 
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function triggerEndGame(io, gameName) {
  const game = games[gameName];
  if (!game) return;

  game.state.isGameRunning = false;
  if (game.intervals.tick) clearInterval(game.intervals.tick);
  if (game.intervals.end) clearTimeout(game.intervals.end);

  const totalPoints = Object.values(game.state.players).reduce((sum, p) => sum + (p.score || 0), 0);

  io.to(gameName).emit('gameEnded', {
    stats: game.state.stats,
    totalPoints: totalPoints,
    players: game.state.players
  });
  console.log(`🛑 Game [${gameName}] Ended.`);
}

io.on('connection', (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

  // --- NEW: Centralized Leave Logic ---
  function handlePlayerLeaving(socket) {
    const gameName = socketRooms[socket.id];
    if (!gameName || !games[gameName]) return;

    const game = games[gameName];

    if (game.state.hostId === socket.id) {
      // THE HOST LEFT! Destroy the room.
      console.log(`💥 Room [${gameName}] destroyed because the host left/disconnected.`);
      
      // Tell everyone in the room to go back to the menu
      io.to(gameName).emit('gameDestroyed', 'The host disconnected. The game has been closed.');
      
      // Clear any running timers
      if (game.intervals.tick) clearInterval(game.intervals.tick);
      if (game.intervals.end) clearTimeout(game.intervals.end);
      Object.values(game.intervals.treatments).forEach(timer => clearTimeout(timer));

      // Force everyone out of the socket room
      io.socketsLeave(gameName); 
      delete games[gameName];
      
      // Update the lobby list for anyone looking for games
      io.emit('availableGamesList', Object.keys(games).filter(name => !games[name].state.isGameRunning));
    } else {
      // A REGULAR PLAYER LEFT
      delete game.state.players[socket.id];
      socket.leave(gameName);
      io.to(gameName).emit('updatePlayers', Object.values(game.state.players));
      console.log(`👋 Player left room: [${gameName}]`);
    }
    delete socketRooms[socket.id];
  }

  socket.on('getAvailableGames', () => {
    const available = Object.keys(games).filter(name => !games[name].state.isGameRunning);
    socket.emit('availableGamesList', available);
  });

  socket.on('createGame', ({ playerName, gameName }) => {
    if (games[gameName]) return socket.emit('errorMsg', 'A game with that name already exists!');

    games[gameName] = {
      state: {
        hostId: socket.id,
        gameName: gameName,
        players: {},
        isGameRunning: false,
        settings: { durationMinutes: 3 },
        stats: { deaths: 0, saved: 0 },
        endTime: null
      },
      intervals: { tick: null, end: null, treatments: {} }
    };

    const game = games[gameName];
    game.state.players[socket.id] = { id: socket.id, name: playerName, role: 'unassigned', score: 0, currentAilment: null, isBeingTreated: false, treatedBy: null, respawnTime: null };
    
    socket.join(gameName);
    socketRooms[socket.id] = gameName;

    socket.emit('joinedLobby', game.state);
    io.to(gameName).emit('updatePlayers', Object.values(game.state.players));
    
    io.emit('availableGamesList', Object.keys(games).filter(name => !games[name].state.isGameRunning));
  });

  socket.on('joinGame', ({ playerName, gameName }) => {
    const game = games[gameName];
    if (!game) return socket.emit('errorMsg', 'Game does not exist!');
    if (game.state.isGameRunning) return socket.emit('errorMsg', 'Game is already in progress!');

    game.state.players[socket.id] = { id: socket.id, name: playerName, role: 'unassigned', score: 0, currentAilment: null, isBeingTreated: false, treatedBy: null, respawnTime: null };
    
    socket.join(gameName);
    socketRooms[socket.id] = gameName;

    socket.emit('joinedLobby', game.state);
    io.to(gameName).emit('updatePlayers', Object.values(game.state.players));
  });

  // --- NEW: Explicit Leave Event ---
  socket.on('leaveGame', () => {
    handlePlayerLeaving(socket);
  });

  // --- GAME LOGIC ---
  socket.on('updateDuration', (minutes) => {
    const gameName = socketRooms[socket.id];
    if (!games[gameName] || socket.id !== games[gameName].state.hostId) return;
    games[gameName].state.settings.durationMinutes = minutes;
    io.to(gameName).emit('settingsUpdated', games[gameName].state.settings);
  });

  socket.on('assignRoles', () => {
    const gameName = socketRooms[socket.id];
    const game = games[gameName];
    if (!game || socket.id !== game.state.hostId) return;
    
    const playerIds = Object.keys(game.state.players);
    if (playerIds.length < 2) return socket.emit('errorMsg', 'Not enough players.');
    
    shuffleArray(playerIds);
    const numDoctors = Math.max(1, Math.floor(playerIds.length * 0.20));

    playerIds.forEach((id, index) => {
      let player = game.state.players[id];
      player.currentAilment = null; 
      player.isBeingTreated = false;
      player.score = 0;
      player.respawnTime = null;
      player.role = index < numDoctors ? 'doctor' : 'patient';
    });

    io.to(gameName).emit('rolesAssigned', game.state.players);
  });

  socket.on('startGame', () => {
    const gameName = socketRooms[socket.id];
    const game = games[gameName];
    if (!game || socket.id !== game.state.hostId) return;

    const hasUnassigned = Object.values(game.state.players).some(p => p.role === 'unassigned');
    if (hasUnassigned) {
      return socket.emit('errorMsg', 'Cannot start the game. All players must have a role assigned!');
    }

    game.state.isGameRunning = true;
    game.state.stats = { deaths: 0, saved: 0 };
    
    const durationMs = game.state.settings.durationMinutes * 60 * 1000;
    game.state.endTime = Date.now() + durationMs;

    Object.values(game.state.players).forEach(player => {
      if (player.role === 'patient') player.currentAilment = getRandomAilment();
    });

    io.to(gameName).emit('gameStarted', game.state);
    io.emit('availableGamesList', Object.keys(games).filter(name => !games[name].state.isGameRunning));

    if (game.intervals.tick) clearInterval(game.intervals.tick);
    game.intervals.tick = setInterval(() => {
      if (!game.state.isGameRunning) return;
      let stateChanged = false;

      Object.values(game.state.players).forEach(player => {
        if (player.role === 'patient' && player.currentAilment && player.currentAilment.statusLevel > 0) {
          if (Math.random() < player.currentAilment.deteriorationChance) {
            player.currentAilment.statusLevel -= 1;
            stateChanged = true;
            
            if (player.currentAilment.statusLevel === 0) {
              game.state.stats.deaths += 1;
              
              if (player.isBeingTreated) {
                if (game.intervals.treatments[player.id]) {
                  clearTimeout(game.intervals.treatments[player.id]);
                  delete game.intervals.treatments[player.id];
                }
                if (player.treatedBy) {
                  io.to(player.treatedBy).emit('errorMsg', 'Treatment failed! Patient flatlined.');
                  io.to(player.treatedBy).emit('treatmentComplete'); 
                }
              }

              player.isBeingTreated = false;
              player.treatmentEndTime = null;
              player.treatedBy = null;
              player.respawnTime = Date.now() + 10000; 

              setTimeout(() => {
                if (!game.state.isGameRunning) return;
                if (player.currentAilment && player.currentAilment.statusLevel === 0) {
                  player.currentAilment = getRandomAilment();
                  player.respawnTime = null;
                  io.to(gameName).emit('tickUpdate', game.state);
                }
              }, 10000);
            }
          }
        }
      });
      if (stateChanged) io.to(gameName).emit('tickUpdate', game.state);
    }, 5000);

    if (game.intervals.end) clearTimeout(game.intervals.end);
    game.intervals.end = setTimeout(() => { triggerEndGame(io, gameName); }, durationMs);
  });

  socket.on('startTreatment', (patientId) => {
    const gameName = socketRooms[socket.id];
    const game = games[gameName];
    if (!game) return;

    const doctor = game.state.players[socket.id];
    const patient = game.state.players[patientId];

    if (!doctor || doctor.role !== 'doctor') return;
    if (!patient || patient.role !== 'patient') return socket.emit('errorMsg', 'Invalid patient scanned.');
    if (patient.currentAilment.statusLevel <= 0) return socket.emit('errorMsg', 'Patient flatlined!');
    if (patient.isBeingTreated) return socket.emit('errorMsg', 'Another doctor is treating this patient!');

    patient.isBeingTreated = true;
    patient.treatedBy = doctor.id;
    const durationSeconds = patient.currentAilment.treatmentTime;
    patient.treatmentEndTime = Date.now() + (durationSeconds * 1000);

    socket.emit('treatmentStarted', { patientId: patient.id, duration: durationSeconds });
    io.to(gameName).emit('updatePlayers', Object.values(game.state.players));

    game.intervals.treatments[patient.id] = setTimeout(() => {
      if (!game.state.isGameRunning) return;
      delete game.intervals.treatments[patient.id];

      const pointsEarned = patient.currentAilment.basePoints;
      doctor.score += pointsEarned;
      game.state.stats.saved += 1; 

      patient.currentAilment = null; 
      patient.isBeingTreated = false;
      patient.treatmentEndTime = null;
      patient.treatedBy = null;
      patient.respawnTime = Date.now() + 10000; 

      socket.emit('treatmentComplete', { patientId: patient.id, pointsEarned, newScore: doctor.score });
      io.to(gameName).emit('scoreUpdate', game.state.players); 

      setTimeout(() => {
        if (!game.state.isGameRunning) return;
        if (!patient.currentAilment) {
          patient.currentAilment = getRandomAilment();
          patient.respawnTime = null;
          io.to(gameName).emit('scoreUpdate', game.state.players);
        }
      }, 10000);

    }, durationSeconds * 1000);
  });

  socket.on('endGameEarly', () => {
    const gameName = socketRooms[socket.id];
    if (gameName && games[gameName].state.hostId === socket.id && games[gameName].state.isGameRunning) {
      triggerEndGame(io, gameName);
    }
  });

  socket.on('returnToLobby', () => {
    const gameName = socketRooms[socket.id];
    if (gameName && games[gameName].state.hostId === socket.id) {
      io.to(gameName).emit('returnedToLobby');
    }
  });

  // --- UPDATED: Disconnect logic routes to our central handler ---
  socket.on('disconnect', () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
    handlePlayerLeaving(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🏥 ER Triage Server running on port ${PORT}`));