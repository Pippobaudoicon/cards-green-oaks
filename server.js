const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Italian card deck configuration
const SUITS = ['Coppe', 'Denari', 'Spade', 'Bastoni'];
const VALUES = [
  { name: '1', display: '1' },
  { name: '2', display: '2' },
  { name: '3', display: '3' },
  { name: '4', display: '4' },
  { name: '5', display: '5' },
  { name: '6', display: '6' },
  { name: '7', display: '7' },
  { name: 'Fante', display: 'J' },
  { name: 'Regina', display: 'Q' },
  { name: 'Re', display: 'K' }
];

// Room storage
const rooms = new Map();

// Room cleanup configuration
const ROOM_CLEANUP_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const ROOM_INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes of inactivity

// Create a new deck of 40 Italian cards
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({
        id: uuidv4(),
        suit,
        value: value.name,
        display: value.display,
        fullName: `${value.display} di ${suit}`
      });
    }
  }
  return shuffle(deck);
}

// Shuffle array using Fisher-Yates algorithm
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Create a new room
function createRoom(roomId, passcode, hostSocketId) {
  const room = {
    id: roomId,
    passcode,
    hostId: hostSocketId,
    users: new Map(),
    deck: createDeck(),
    drawnCards: [],
    history: [],
    createdAt: new Date(),
    lastActivity: new Date() // Track last activity for cleanup
  };
  
  rooms.set(roomId, room);
  return room;
}

// Add user to room
function addUserToRoom(roomId, socketId, username, isHost = false) {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  const user = {
    id: socketId,
    username,
    isHost,
    joinedAt: new Date()
  };
  
  room.users.set(socketId, user);
  return user;
}

// Remove user from room
function removeUserFromRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.users.delete(socketId);
  updateRoomActivity(roomId); // Update activity when user leaves
  
  // If host leaves, assign host to another user
  if (room.hostId === socketId && room.users.size > 0) {
    const newHost = room.users.values().next().value;
    room.hostId = newHost.id;
    newHost.isHost = true;
  }
  
  // Delete room if empty
  if (room.users.size === 0) {
    rooms.delete(roomId);
    console.log(`Room ${roomId} deleted - empty`);
  }
}

// Update room activity timestamp
function updateRoomActivity(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.lastActivity = new Date();
  }
}

// Draw a card from the deck
function drawCard(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room || room.deck.length === 0) return null;
  
  const user = room.users.get(socketId);
  if (!user) return null;
  
  updateRoomActivity(roomId); // Update activity when card is drawn
  
  const drawnCard = room.deck.pop();
  room.drawnCards.push(drawnCard);
  
  const historyEntry = {
    id: uuidv4(),
    card: drawnCard,
    drawnBy: user.username,
    timestamp: new Date(),
    cardsRemaining: room.deck.length
  };
  
  room.history.push(historyEntry);
  
  return { card: drawnCard, historyEntry };
}

// Reshuffle deck (host only)
function reshuffleDeck(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  const user = room.users.get(socketId);
  if (!user || !user.isHost) return false;
  
  updateRoomActivity(roomId); // Update activity when deck is reshuffled
  
  // Put all drawn cards back and shuffle
  room.deck = shuffle([...room.deck, ...room.drawnCards]);
  room.drawnCards = [];
  
  const historyEntry = {
    id: uuidv4(),
    action: 'reshuffle',
    performedBy: user.username,
    timestamp: new Date(),
    cardsRemaining: room.deck.length
  };
  
  room.history.push(historyEntry);
  
  return historyEntry;
}

// Clean up inactive rooms
function cleanupInactiveRooms() {
  const now = new Date();
  const roomsToDelete = [];
  
  for (const [roomId, room] of rooms) {
    const timeSinceLastActivity = now - room.lastActivity;
    
    // If room is empty for more than 15 minutes, mark for deletion
    if (room.users.size === 0 && timeSinceLastActivity > ROOM_INACTIVITY_TIMEOUT) {
      roomsToDelete.push(roomId);
    }
  }
  
  // Delete inactive rooms
  roomsToDelete.forEach(roomId => {
    rooms.delete(roomId);
    console.log(`Room ${roomId} deleted - inactive for ${Math.round(ROOM_INACTIVITY_TIMEOUT / 60000)} minutes`);
  });
  
  if (roomsToDelete.length > 0) {
    console.log(`Cleaned up ${roomsToDelete.length} inactive room(s). Active rooms: ${rooms.size}`);
  }
}

// Start periodic cleanup
setInterval(cleanupInactiveRooms, ROOM_CLEANUP_INTERVAL);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Resume session
  socket.on('resume-session', (data) => {
    const { roomId, username, passcode } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('resume-error', { message: 'Stanza non trovata o scaduta' });
      return;
    }
    
    if (room.passcode !== passcode) {
      socket.emit('resume-error', { message: 'Codice stanza non valido' });
      return;
    }
    
    // Check if user was previously in this room
    let wasHost = false;
    for (const user of room.users.values()) {
      if (user.username === username) {
        wasHost = user.isHost;
        break;
      }
    }
    
    // Add user back to room
    const user = addUserToRoom(roomId, socket.id, username, wasHost);
    socket.join(roomId);
    
    updateRoomActivity(roomId);
    
    socket.emit('session-resumed', {
      roomId,
      user,
      room: {
        id: room.id,
        users: Array.from(room.users.values()),
        deckSize: room.deck.length,
        history: room.history
      }
    });
    
    // Notify other users
    socket.to(roomId).emit('user-rejoined', { user });
    
    console.log(`${username} resumed session in room ${roomId}`);
  });
  
  // Create room
  socket.on('create-room', (data) => {
    const { username, passcode } = data;
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const room = createRoom(roomId, passcode, socket.id);
    const user = addUserToRoom(roomId, socket.id, username, true);
    
    socket.join(roomId);
    
    socket.emit('room-created', {
      roomId,
      user,
      room: {
        id: room.id,
        users: Array.from(room.users.values()),
        deckSize: room.deck.length,
        history: room.history
      }
    });
    
    console.log(`Room ${roomId} created by ${username}`);
  });
    // Join room
  socket.on('join-room', (data) => {
    const { roomId, username, passcode } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('join-error', { message: 'Room not found' });
      return;
    }
    
    if (room.passcode !== passcode) {
      socket.emit('join-error', { message: 'Invalid passcode' });
      return;
    }
    
    const user = addUserToRoom(roomId, socket.id, username);
    socket.join(roomId);
    
    updateRoomActivity(roomId); // Update activity when user joins
    
    socket.emit('room-joined', {
      roomId,
      user,
      room: {
        id: room.id,
        users: Array.from(room.users.values()),
        deckSize: room.deck.length,
        history: room.history
      }
    });
    
    // Notify other users
    socket.to(roomId).emit('user-joined', { user });
    
    console.log(`${username} joined room ${roomId}`);
  });
  
  // Draw card
  socket.on('draw-card', (data) => {
    const { roomId } = data;
    const result = drawCard(roomId, socket.id);
    
    if (!result) {
      socket.emit('draw-error', { message: 'Cannot draw card' });
      return;
    }
    
    const room = rooms.get(roomId);
    
    // Send to all users in room
    io.to(roomId).emit('card-drawn', {
      card: result.card,
      historyEntry: result.historyEntry,
      deckSize: room.deck.length,
      drawnBy: room.users.get(socket.id).username
    });
  });
  
  // Reshuffle deck (host only)
  socket.on('reshuffle-deck', (data) => {
    const { roomId } = data;
    const historyEntry = reshuffleDeck(roomId, socket.id);
    
    if (!historyEntry) {
      socket.emit('reshuffle-error', { message: 'Cannot reshuffle deck' });
      return;
    }
    
    const room = rooms.get(roomId);
    
    // Send to all users in room
    io.to(roomId).emit('deck-reshuffled', {
      historyEntry,
      deckSize: room.deck.length
    });
  });
  
  // Get room info
  socket.on('get-room-info', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('room-info-error', { message: 'Room not found' });
      return;
    }
    
    socket.emit('room-info', {
      room: {
        id: room.id,
        users: Array.from(room.users.values()),
        deckSize: room.deck.length,
        history: room.history
      }
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from all rooms
    for (const [roomId, room] of rooms) {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        removeUserFromRoom(roomId, socket.id);
        
        // Notify other users
        socket.to(roomId).emit('user-left', { user });
        
        // If room still exists and has users, send updated info
        if (rooms.has(roomId)) {
          const updatedRoom = rooms.get(roomId);
          io.to(roomId).emit('room-updated', {
            users: Array.from(updatedRoom.users.values()),
            hostId: updatedRoom.hostId
          });
        }
        
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`🃏 Italian Card Game Server running on port ${PORT}`);
  console.log(`🌐 Open your browser to http://localhost:${PORT}`);
});
