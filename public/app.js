// Socket.IO connection
const socket = io();

// Session management
const SESSION_KEY = 'italian-cards-session';

function saveSession(sessionData) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            ...sessionData,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save session to localStorage:', error);
    }
}

function loadSession() {
    try {
        const sessionStr = localStorage.getItem(SESSION_KEY);
        if (!sessionStr) return null;
        
        const session = JSON.parse(sessionStr);
        
        // Check if session is not older than 24 hours
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() - session.timestamp > maxAge) {
            clearSession();
            return null;
        }
        
        return session;
    } catch (error) {
        console.warn('Failed to load session from localStorage:', error);
        clearSession();
        return null;
    }
}

function clearSession() {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch (error) {
        console.warn('Failed to clear session:', error);
    }
}

// Global state
let currentUser = null;
let currentRoom = null;
let isHost = false;

// DOM elements
const welcomeScreen = document.getElementById('welcome-screen');
const gameScreen = document.getElementById('game-screen');
const loadingScreen = document.getElementById('loading-screen');

const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const drawCardBtn = document.getElementById('draw-card-btn');
const reshuffleBtn = document.getElementById('reshuffle-btn');

const createRoomModal = document.getElementById('create-room-modal');
const joinRoomModal = document.getElementById('join-room-modal');
const errorModal = document.getElementById('error-modal');
const successModal = document.getElementById('success-modal');

const createRoomForm = document.getElementById('create-room-form');
const joinRoomForm = document.getElementById('join-room-form');

const roomIdDisplay = document.getElementById('room-id-display');
const usernameDisplay = document.getElementById('username-display');
const hostBadge = document.getElementById('host-badge');
const deckCount = document.getElementById('deck-count');
const userCount = document.getElementById('user-count');
const usersList = document.getElementById('users-list');
const historyList = document.getElementById('history-list');
const lastCardSection = document.getElementById('last-card-section');
const lastCardDisplay = document.getElementById('last-card-display');
const sessionIndicator = document.getElementById('session-indicator');
const clearSessionBtn = document.getElementById('clear-session-btn');

// Utility functions
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    openModal('error-modal');
}

function showSuccess(message) {
    document.getElementById('success-message').textContent = message;
    openModal('success-modal');
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function getSuitSymbol(suit) {
    const symbols = {
        'Coppe': '♥',
        'Denari': '♦',
        'Spade': '♠',
        'Bastoni': '♣'
    };
    return symbols[suit] || suit;
}

function getSuitClass(suit) {
    return `suit-${suit.toLowerCase()}`;
}

function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = `card-display ${getSuitClass(card.suit)}`;
    
    cardElement.innerHTML = `
        <div class="card-value">${card.display}</div>
        <div class="card-suit">${getSuitSymbol(card.suit)}</div>
        <div class="card-name">${card.fullName}</div>
    `;
    
    return cardElement;
}

function updateRoomDisplay() {
    if (!currentRoom) return;
    
    roomIdDisplay.textContent = currentRoom.id;
    usernameDisplay.textContent = currentUser.username;
    hostBadge.style.display = isHost ? 'inline-block' : 'none';
    deckCount.textContent = currentRoom.deckSize;
    userCount.textContent = currentRoom.users.length;
    
    // Update host privileges
    document.body.classList.toggle('is-host', isHost);
    
    // Update users list
    usersList.innerHTML = '';
    currentRoom.users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = `user-item ${user.isHost ? 'host' : ''}`;
        userElement.innerHTML = `
            <span class="user-name">${user.username}</span>
            ${user.isHost ? '<span class="user-status">👑 Host</span>' : '<span class="user-status">Giocatore</span>'}
        `;
        usersList.appendChild(userElement);
    });
    
    // Update history
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    if (!currentRoom) return;
    
    historyList.innerHTML = '';
    
    // Show recent history first
    const recentHistory = [...currentRoom.history].reverse().slice(0, 20);
    
    recentHistory.forEach(entry => {
        const historyElement = document.createElement('div');
        historyElement.className = `history-item ${entry.action === 'reshuffle' ? 'reshuffle' : ''}`;
        
        let content = '';
        if (entry.action === 'reshuffle') {
            content = `🔄 ${entry.performedBy} ha rimescolato il mazzo`;
        } else {
            content = `🃏 ${entry.drawnBy} ha pescato: ${entry.card.fullName}`;
        }
        
        historyElement.innerHTML = `
            <div>${content}</div>
            <div class="history-time">${formatTime(entry.timestamp)}</div>
        `;
        
        historyList.appendChild(historyElement);
    });
}

function displayLastCard(card) {
    const cardElement = createCardElement(card);
    cardElement.classList.add('card-draw-animation');
    
    lastCardDisplay.innerHTML = '';
    lastCardDisplay.appendChild(cardElement);
    lastCardSection.style.display = 'block';
}

function updateSessionIndicator() {
    const savedSession = loadSession();
    if (savedSession && savedSession.roomId) {
        sessionIndicator.style.display = 'flex';
        const sessionText = document.querySelector('.session-text');
        sessionText.textContent = `Stanza: ${savedSession.roomId} - ${savedSession.username}`;
    } else {
        sessionIndicator.style.display = 'none';
    }
}

// Event listeners
createRoomBtn.addEventListener('click', () => {
    openModal('create-room-modal');
});

joinRoomBtn.addEventListener('click', () => {
    openModal('join-room-modal');
});

leaveRoomBtn.addEventListener('click', () => {
    if (confirm('Sei sicuro di voler uscire dalla stanza?')) {
        clearSession();
        location.reload();
    }
});

// Clear session button event listener
clearSessionBtn.addEventListener('click', () => {
    if (confirm('Sei sicuro di voler eliminare la sessione salvata?')) {
        clearSession();
        updateSessionIndicator();
        showSuccess('Sessione eliminata!');
    }
});

drawCardBtn.addEventListener('click', () => {
    if (currentRoom && currentRoom.deckSize > 0) {
        drawCardBtn.disabled = true;
        socket.emit('draw-card', { roomId: currentRoom.id });
        
        // Re-enable button after a short delay
        setTimeout(() => {
            drawCardBtn.disabled = false;
        }, 1000);
    }
});

reshuffleBtn.addEventListener('click', () => {
    if (isHost && confirm('Sei sicuro di voler rimescolare il mazzo?')) {
        socket.emit('reshuffle-deck', { roomId: currentRoom.id });
    }
});

createRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('create-username').value.trim();
    const passcode = document.getElementById('create-passcode').value.trim();
    
    if (!username) {
        showError('Inserisci un nome valido');
        return;
    }
    
    // Store the passcode temporarily for session saving
    window.pendingCreateData = {
        username,
        passcode: passcode || ''
    };
    
    showScreen('loading-screen');
    closeModal('create-room-modal');
    
    socket.emit('create-room', {
        username,
        passcode: passcode || ''
    });
});

joinRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('join-username').value.trim();
    const roomId = document.getElementById('join-room-id').value.trim().toUpperCase();
    const passcode = document.getElementById('join-passcode').value.trim();
    
    if (!username || !roomId) {
        showError('Inserisci nome e ID stanza');
        return;
    }
    
    // Store the passcode temporarily for session saving
    window.pendingJoinData = {
        username,
        roomId,
        passcode: passcode || ''
    };
    
    showScreen('loading-screen');
    closeModal('join-room-modal');
    
    socket.emit('join-room', {
        username,
        roomId,
        passcode: passcode || ''
    });
});

// Socket event listeners
socket.on('connect', () => {
    console.log('Connesso al server');
    
    // Update session indicator on connect
    updateSessionIndicator();
    
    // Try to resume previous session
    const savedSession = loadSession();
    if (savedSession && savedSession.roomId && savedSession.username) {
        console.log('Tentativo di ripresa sessione...', savedSession);
        showScreen('loading-screen');
        
        socket.emit('resume-session', {
            roomId: savedSession.roomId,
            username: savedSession.username,
            passcode: savedSession.passcode || ''
        });
    } else {
        showScreen('welcome-screen');
    }
});

socket.on('disconnect', () => {
    console.log('Disconnesso dal server');
    showError('Connessione persa. Ricarica la pagina per riconnetterti.');
});

socket.on('room-created', (data) => {
    currentUser = data.user;
    currentRoom = data.room;
    isHost = true;
    
    // Use the passcode from the pending create data
    const passcode = window.pendingCreateData ? window.pendingCreateData.passcode : '';
    
    // Save session
    saveSession({
        roomId: data.roomId,
        username: data.user.username,
        passcode: passcode,
        isHost: true
    });
    
    // Clean up temporary data
    delete window.pendingCreateData;
    
    // Update session indicator
    updateSessionIndicator();
    
    showScreen('game-screen');
    updateRoomDisplay();
    
    showSuccess(`Stanza creata con successo! ID: ${data.roomId}`);
});

socket.on('room-joined', (data) => {
    currentUser = data.user;
    currentRoom = data.room;
    isHost = data.user.isHost;
    
    // Use the passcode from the pending join data
    const passcode = window.pendingJoinData ? window.pendingJoinData.passcode : '';
    
    // Save session
    saveSession({
        roomId: data.roomId,
        username: data.user.username,
        passcode: passcode,
        isHost: data.user.isHost
    });
    
    // Clean up temporary data
    delete window.pendingJoinData;
    
    // Update session indicator
    updateSessionIndicator();
    
    showScreen('game-screen');
    updateRoomDisplay();
    
    showSuccess(`Entrato nella stanza ${data.roomId}!`);
});

// Session resume handlers
socket.on('session-resumed', (data) => {
    currentUser = data.user;
    currentRoom = data.room;
    isHost = data.user.isHost;
    
    // Update session indicator
    updateSessionIndicator();
    
    showScreen('game-screen');
    updateRoomDisplay();
    
    showSuccess(`Sessione ripristinata! Benvenuto nella stanza ${data.roomId}`);
});

socket.on('resume-error', (data) => {
    console.log('Errore ripresa sessione:', data.message);
    clearSession();
    updateSessionIndicator();
    showScreen('welcome-screen');
    showError(`Impossibile ripristinare la sessione: ${data.message}`);
});

socket.on('user-joined', (data) => {
    if (currentRoom) {
        currentRoom.users.push(data.user);
        updateRoomDisplay();
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = `${data.user.username} è entrato nella stanza`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
});

socket.on('user-left', (data) => {
    if (currentRoom) {
        currentRoom.users = currentRoom.users.filter(user => user.id !== data.user.id);
        updateRoomDisplay();
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = `${data.user.username} ha lasciato la stanza`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
});

socket.on('user-rejoined', (data) => {
    if (currentRoom) {
        // Show notification for returning user
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = `${data.user.username} è tornato nella stanza`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
});

socket.on('room-updated', (data) => {
    if (currentRoom) {
        currentRoom.users = data.users;
        
        // Check if current user became host
        const currentUserData = data.users.find(user => user.id === socket.id);
        if (currentUserData) {
            isHost = currentUserData.isHost;
        }
        
        updateRoomDisplay();
    }
});

socket.on('card-drawn', (data) => {
    if (currentRoom) {
        currentRoom.deckSize = data.deckSize;
        currentRoom.history.push(data.historyEntry);
        
        displayLastCard(data.card);
        updateRoomDisplay();
        
        // Update draw button state
        drawCardBtn.disabled = data.deckSize === 0;
        if (data.deckSize === 0) {
            drawCardBtn.textContent = 'Mazzo Vuoto';
        } else {
            drawCardBtn.innerHTML = '<span class="btn-icon">🃏</span> Pesca Carta';
        }
    }
});

socket.on('deck-reshuffled', (data) => {
    if (currentRoom) {
        currentRoom.deckSize = data.deckSize;
        currentRoom.history.push(data.historyEntry);
        
        updateRoomDisplay();
        
        // Reset draw button
        drawCardBtn.disabled = false;
        drawCardBtn.innerHTML = '<span class="btn-icon">🃏</span> Pesca Carta';
        
        // Hide last card
        lastCardSection.style.display = 'none';
        
        showSuccess('Mazzo rimescolato!');
    }
});

socket.on('join-error', (data) => {
    // Clean up temporary data
    delete window.pendingJoinData;
    
    showScreen('welcome-screen');
    showError(data.message);
});

socket.on('draw-error', (data) => {
    drawCardBtn.disabled = false;
    showError(data.message);
});

socket.on('reshuffle-error', (data) => {
    showError(data.message);
});

// Global modal close function
window.closeModal = closeModal;

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    // Space to draw card (when in game)
    if (e.key === ' ' && currentRoom && !drawCardBtn.disabled && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        drawCardBtn.click();
    }
});

// Click outside modal to close
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Auto-focus first input when modal opens
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const modal = mutation.target;
            if (modal.classList.contains('active')) {
                const firstInput = modal.querySelector('input');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
            }
        }
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    observer.observe(modal, { attributes: true });
});

// Initial state
showScreen('loading-screen');
