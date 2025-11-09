const socket = io();

const lobbyScreen = document.getElementById('lobbyScreen');
const roomScreen = document.getElementById('roomScreen');
const gameScreen = document.getElementById('gameScreen');
const votingScreen = document.getElementById('votingScreen');
const ejectedOverlay = document.getElementById('ejectedOverlay'); 
const gameEndOverlay = document.getElementById('gameEndOverlay'); 

const usernameInput = document.getElementById('usernameInput');
const createPrivateRoomBtn = document.getElementById('createPrivateRoomBtn');
const createPublicRoomBtn = document.getElementById('createPublicRoomBtn');
const joinPublicRoomBtn = document.getElementById('joinPublicRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');

const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const roomVisibility = document.getElementById('roomVisibility'); 
const playerList = document.getElementById('playerList');
const hostControls = document.getElementById('hostControls');
const modeIRLBtn = document.getElementById('modeIRLBtn');
const modeOnlineBtn = document.getElementById('modeOnlineBtn');
const gameModeDisplay = document.getElementById('gameModeDisplay');
const startGameBtn = document.getElementById('startGameBtn');
const impostorCountSelect = document.getElementById('impostorCountSelect');
const maxPlayersSelect = document.getElementById('maxPlayersSelect'); 
const leaveRoomBtn = document.getElementById('leaveRoomBtn'); 

const gameStatus = document.getElementById('gameStatus');
const gameTimer = document.getElementById('gameTimer'); 
const gameCategory = document.getElementById('gameCategory');
const gameWord = document.getElementById('gameWord');
const roleInfo = document.getElementById('roleInfo');
const chatOnline = document.getElementById('chatOnline');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const controlsIRL = document.getElementById('controlsIRL');
const nextTurnIRLBtn = document.getElementById('nextTurnIRLBtn');
const votingButtons = document.getElementById('votingButtons');
const voteStatus = document.getElementById('voteStatus');
const ejectedRoleInfo = document.getElementById('ejectedRoleInfo');
const closeEjectedOverlayBtn = document.getElementById('closeEjectedOverlayBtn');
const gameEndTitle = document.getElementById('gameEndTitle');
const gameEndWinner = document.getElementById('gameEndWinner');
const gameEndImpostors = document.getElementById('gameEndImpostors');
const backToLobbyBtn = document.getElementById('backToLobbyBtn');


let currentRoomCode = '';
let myUsername = '';
let isAlive = true; 
let turnCountdown = null; 
let currentGameMode = ''; 

createPrivateRoomBtn.addEventListener('click', () => {
    myUsername = usernameInput.value;
    if (myUsername) {
        socket.emit('createPrivateRoom', myUsername);
    }
});

createPublicRoomBtn.addEventListener('click', () => {
    myUsername = usernameInput.value;
    if (myUsername) {
        socket.emit('createPublicRoom', myUsername);
    }
});

joinPublicRoomBtn.addEventListener('click', () => {
    myUsername = usernameInput.value;
    if (myUsername) {
        socket.emit('joinPublicRoom', myUsername);
    }
});

joinRoomBtn.addEventListener('click', () => {
    myUsername = usernameInput.value;
    const roomCode = roomCodeInput.value;
    if (myUsername && roomCode) {
        socket.emit('joinRoom', { username: myUsername, roomCode: roomCode });
    }
});

modeIRLBtn.addEventListener('click', () => {
    socket.emit('setGameMode', { roomCode: currentRoomCode, mode: 'IRL' });
});

modeOnlineBtn.addEventListener('click', () => {
    socket.emit('setGameMode', { roomCode: currentRoomCode, mode: 'Online' });
});

impostorCountSelect.addEventListener('change', () => {
    socket.emit('setImpostorCount', { roomCode: currentRoomCode, count: impostorCountSelect.value });
});

maxPlayersSelect.addEventListener('change', () => {
    socket.emit('setMaxPlayers', { roomCode: currentRoomCode, count: maxPlayersSelect.value });
});

startGameBtn.addEventListener('click', () => {
    socket.emit('startGame', currentRoomCode);
    startGameBtn.disabled = true; 
});

leaveRoomBtn.addEventListener('click', () => {
    window.location.reload();
});

backToLobbyBtn.addEventListener('click', () => {
    gameEndOverlay.style.display = 'none';
    showScreen('roomScreen');
});

closeEjectedOverlayBtn.addEventListener('click', () => {
    ejectedOverlay.style.display = 'none';
});

sendChatBtn.addEventListener('click', () => {
    sendMessage();
});
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

nextTurnIRLBtn.addEventListener('click', () => {
    if (isAlive) {
        socket.emit('nextTurnIRL', { roomCode: currentRoomCode });
        nextTurnIRLBtn.disabled = true;
    }
});

function sendMessage() {
    const message = chatInput.value;
    if (message && isAlive) {
        socket.emit('chatMessage', { roomCode: currentRoomCode, message });
        chatInput.value = '';
        chatInput.disabled = true; 
        chatInput.placeholder = "Esperando tu turno...";
        if (turnCountdown) clearInterval(turnCountdown);
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function updatePlayerList(players, hostId) {
    playerList.innerHTML = '';
    const amIHost = (socket.id === hostId);

    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name + (player.id === socket.id ? ' (Tú)' : '');
        
        if (!player.isAlive) {
            li.dataset.status = "dead";
        }

        if (amIHost && player.id !== socket.id) {
            const kickBtn = document.createElement('button');
            kickBtn.textContent = 'X';
            kickBtn.className = 'kick-btn';
            kickBtn.onclick = () => {
                if (confirm(`¿Seguro que quieres echar a ${player.name}?`)) {
                    socket.emit('kickPlayer', { roomCode: currentRoomCode, playerId: player.id });
                }
            };
            li.appendChild(kickBtn);
        }
        playerList.appendChild(li);
    });
}

function startVisualTimer(duration) {
    if (turnCountdown) clearInterval(turnCountdown);
    
    let timeLeft = duration;
    gameTimer.textContent = timeLeft;
    gameTimer.style.display = 'block';

    turnCountdown = setInterval(() => {
        timeLeft--;
        gameTimer.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(turnCountdown);
            gameTimer.style.display = 'none';
        }
    }, 1000);
}

socket.on('roomCreated', ({ roomCode, players, host, isPublic }) => {
    currentRoomCode = roomCode;
    showScreen('roomScreen');
    roomCodeDisplay.textContent = roomCode;
    roomVisibility.textContent = isPublic ? 'Pública' : 'Privada'; 
    updatePlayerList(players, host);
    if (host === socket.id) {
        hostControls.style.display = 'block';
    }
    leaveRoomBtn.style.display = 'block';
});

socket.on('roomJoined', ({ roomCode, players, host, gameMode, isPublic }) => {
    currentRoomCode = roomCode;
    showScreen('roomScreen');
    roomCodeDisplay.textContent = roomCode;
    roomVisibility.textContent = isPublic ? 'Pública' : 'Privada'; 
    gameModeDisplay.textContent = gameMode || 'No seleccionado';
    updatePlayerList(players, host);
    if (host === socket.id) {
        hostControls.style.display = 'block';
    }
    leaveRoomBtn.style.display = 'block';
});

socket.on('playerJoined', ({ players, host }) => {
    updatePlayerList(players, host);
});

socket.on('playerLeft', ({ players, host }) => {
    updatePlayerList(players, host);
    if (host === socket.id) {
        hostControls.style.display = 'block';
    }
});

socket.on('gameModeUpdated', (mode) => {
    gameModeDisplay.textContent = mode;
});

socket.on('gameStarted', ({ category, word, role, mode }) => {
    isAlive = true;
    currentGameMode = mode; 
    ejectedOverlay.style.display = 'none';
    showScreen('gameScreen');
    
    gameCategory.textContent = category;
    gameWord.textContent = word;
    roleInfo.textContent = role;
    
    chatMessages.innerHTML = ''; 
    
    if (mode === 'Online') {
        chatOnline.style.display = 'block';
        controlsIRL.style.display = 'none';
        chatInput.disabled = true;
        chatInput.placeholder = "Esperando tu turno...";
    } else { 
        chatOnline.style.display = 'none';
        controlsIRL.style.display = 'block';
        nextTurnIRLBtn.disabled = true;
    }
});

socket.on('turnUpdate', ({ currentPlayerName, round, gameMode }) => {
    if (!isAlive) return;
    gameStatus.textContent = `Ronda ${round}. Turno de: ${currentPlayerName}`;
    
    if (gameMode === 'Online') {
        chatInput.disabled = true; 
        chatInput.placeholder = "Esperando tu turno...";
    } else {
        nextTurnIRLBtn.disabled = true;
    }
});

socket.on('timerUpdate', (duration) => {
    if (currentGameMode === 'Online') {
        startVisualTimer(duration);
    }
});

socket.on('yourTurn', ({ gameMode }) => {
    if (!isAlive) return;
    
    if (gameMode === 'Online') {
        chatInput.disabled = false;
        chatInput.placeholder = "¡Es tu turno! Di tu palabra.";
        chatInput.focus();
    } else { 
        nextTurnIRLBtn.disabled = false;
    }
});

socket.on('startVote', ({ players }) => {
    if (!isAlive) return; 

    showScreen('votingScreen');
    votingButtons.innerHTML = ''; 
    voteStatus.textContent = 'Elige a un jugador';
    
    players.forEach(player => {
        const button = document.createElement('button');
        button.textContent = player.name;
        if (player.id === socket.id) {
            button.disabled = true; 
        }
        button.addEventListener('click', () => {
            socket.emit('submitVote', { roomCode: currentRoomCode, votedForId: player.id });
            voteStatus.textContent = `Has votado por ${player.name}. Esperando...`;
            votingButtons.querySelectorAll('button').forEach(btn => btn.disabled = true);
        });
        votingButtons.appendChild(button);
    });
});

socket.on('voteReceived', () => {
    if (!isAlive) return;
    voteStatus.textContent = 'Voto registrado. Esperando al resto...';
});

socket.on('voteResult', ({ message, wasImpostor }) => {
    if (!isAlive) return;

    let resultText = message;
    if (wasImpostor === true) {
        resultText += " ¡Era un IMPOSTOR!";
    } else if (wasImpostor === false) {
        resultText += " No era un impostor.";
    }
    
    voteStatus.textContent = resultText;

    setTimeout(() => {
        if (isAlive) {
            showScreen('gameScreen');
        }
    }, 4000); 
});


socket.on('youAreOut', ({ role }) => {
    isAlive = false;
    ejectedRoleInfo.textContent = role; 
    ejectedOverlay.style.display = 'flex';
    if (turnCountdown) clearInterval(turnCountdown);
    gameTimer.style.display = 'none';
});

socket.on('gameEnd', ({ winner, impostorNames }) => {
    gameEndTitle.textContent = `¡Ganan los ${winner}!`;
    gameEndWinner.textContent = `Los ${winner} han ganado la partida.`;
    gameEndImpostors.textContent = `Los impostores eran: ${impostorNames}`;
    
    gameEndOverlay.style.display = 'flex'; 
    ejectedOverlay.style.display = 'none'; 
    if (turnCountdown) clearInterval(turnCountdown);
    gameTimer.style.display = 'none';
});

socket.on('backToLobby', ({ players, host }) => {
    updatePlayerList(players, host);
    startGameBtn.disabled = false;
    if (host === socket.id) {
        hostControls.style.display = 'block';
    }
    
    ejectedOverlay.style.display = 'none';
    gameEndOverlay.style.display = 'none';
    showScreen('roomScreen');
});

socket.on('youWereKicked', () => {
    alert('¡El anfitrión te ha echado de la sala!');
    window.location.reload();
});

socket.on('error', (message) => {
    alert('Error: ' + message);
    startGameBtn.disabled = false; 
});

socket.on('newChatMessage', ({ user, message }) => {
    const msgEl = document.createElement('p');
    if (user === 'SISTEMA') {
        msgEl.innerHTML = `<i>${message}</i>`;
    } else {
        msgEl.innerHTML = `<strong>${user}:</strong> ${message}`;
    }
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight; 
});

// Iniciar en la pantalla de lobby
showScreen('lobbyScreen');