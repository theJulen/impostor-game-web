const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};
const wordList = {
    Frutas: ['Manzana', 'Plátano', 'Naranja', 'Fresa', 'Pera', 'Uva', 'Mango', 'Kiwi', 'Piña', 'Sandía', 'Melón', 'Limón', 'Cereza', 'Coco'],
    Animales: ['Perro', 'Gato', 'León', 'Elefante', 'Tigre', 'Jirafa', 'Caballo', 'Vaca', 'Oveja', 'Cerdo', 'Lobo', 'Zorro', 'Oso', 'Pingüino', 'Delfín', 'Serpiente'],
    Objetos: ['Mesa', 'Silla', 'Lámpara', 'Teléfono', 'Libro', 'Llave', 'Ordenador', 'Reloj', 'Cama', 'Sofá', 'Taza', 'Plato', 'Cuchara', 'Tenedor', 'Gafas'],
    Colores: ['Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja', 'Morado', 'Rosa', 'Negro', 'Blanco', 'Gris', 'Marrón', 'Turquesa', 'Dorado', 'Plateado'],
    Profesiones: ['Médico', 'Profesor', 'Bombero', 'Policía', 'Cocinero', 'Actor', 'Cantante', 'Pintor', 'Fontanero', 'Electricista', 'Piloto', 'Abogado', 'Periodista'],
    Ropa: ['Camiseta', 'Pantalón', 'Zapatos', 'Chaqueta', 'Sombrero', 'Bufanda', 'Guantes', 'Calcetines', 'Vestido', 'Falda', 'Botas', 'Gorra'],
    Deportes: ['Fútbol', 'Baloncesto', 'Tenis', 'Natación', 'Béisbol', 'Golf', 'Boxeo', 'Surf', 'Esquí', 'Ciclismo', 'Voleibol', 'Rugby'],
    Países: ['España', 'Francia', 'Italia', 'Alemania', 'Japón', 'China', 'México', 'Brasil', 'Argentina', 'Egipto', 'Canadá', 'Australia', 'Rusia', 'India'],
    Comida: ['Pizza', 'Hamburguesa', 'Sushi', 'Pasta', 'Ensalada', 'Sopa', 'Taco', 'Paella', 'Helado', 'Chocolate', 'Queso', 'Pan', 'Huevo'],
    Transporte: ['Coche', 'Autobús', 'Avión', 'Tren', 'Barco', 'Bicicleta', 'Moto', 'Helicóptero', 'Metro', 'Taxi', 'Camión'],
    PartesDelCuerpo: ['Mano', 'Pie', 'Cabeza', 'Ojo', 'Nariz', 'Boca', 'Oreja', 'Brazo', 'Pierna', 'Rodilla', 'Codo', 'Pelo', 'Dedo'],
    EnLaCocina: ['Nevera', 'Horno', 'Microondas', 'Sartén', 'Olla', 'Batidora', 'Fregadero', 'Tostadora', 'Cafetera', 'Lavavajillas'],
    Instrumentos: ['Guitarra', 'Piano', 'Violín', 'Batería', 'Flauta', 'Trompeta', 'Saxofón', 'Bajo', 'Arpa', 'Tambor'],
    PelículasFamosas: ['Titanic', 'Star Wars', 'Jurassic Park', 'El Rey León', 'Harry Potter', 'Avengers', 'Avatar', 'Matrix', 'Joker', 'Barbie', 'Oppenheimer'],
    MarcasDeCoche: ['Ford', 'Toyota', 'Honda', 'BMW', 'Mercedes', 'Audi', 'Tesla', 'Ferrari', 'Porsche', 'Volkswagen', 'Nissan', 'Lamborghini'],
    Clima: ['Sol', 'Lluvia', 'Nieve', 'Viento', 'Niebla', 'Tormenta', 'Nube', 'Granizo', 'Arcoíris', 'Tornado']
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function createRoom(socket, username, isPublic) {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomCode] = {
        players: [],
        host: socket.id,
        gameMode: null,
        gameState: 'lobby',
        secretWord: '',
        impostorIds: [],
        impostorCount: 1,
        maxPlayers: 10,
        turnTimer: null,
        isPublic: isPublic,
        currentRound: 0,
        currentPlayerTurn: 0, 
        playerOrder: [], 
        votes: {},
    };
    joinPlayerToRoom(socket, username, roomCode);
    return roomCode;
}

function joinPlayerToRoom(socket, username, roomCode) {
    const room = rooms[roomCode];
    if (!room) return socket.emit('error', 'La sala no existe.');
    
    if (room.gameState !== 'lobby') return socket.emit('error', 'La partida ya ha empezado.');
    if (room.players.length >= room.maxPlayers) return socket.emit('error', 'La sala está llena.');

    socket.join(roomCode);
    room.players.push({ id: socket.id, name: username, isAlive: true });
    
    io.to(roomCode).emit('playerJoined', { players: room.players, host: room.host });
    socket.emit('roomJoined', { 
        roomCode: roomCode, 
        players: room.players, 
        host: room.host, 
        gameMode: room.gameMode,
        isPublic: room.isPublic
    });
    return true;
}

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);
    let currentRoomCode = null; 

    socket.on('createPrivateRoom', (username) => {
        currentRoomCode = createRoom(socket, username, false);
        socket.emit('roomCreated', {
            roomCode: currentRoomCode, 
            players: rooms[currentRoomCode].players, 
            host: rooms[currentRoomCode].host,
            isPublic: false
        });
    });

    socket.on('createPublicRoom', (username) => {
        currentRoomCode = createRoom(socket, username, true);
        socket.emit('roomCreated', {
            roomCode: currentRoomCode, 
            players: rooms[currentRoomCode].players, 
            host: rooms[currentRoomCode].host,
            isPublic: true
        });
    });

    socket.on('joinPublicRoom', (username) => {
        let foundRoomCode = null;
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.isPublic && room.gameState === 'lobby' && room.players.length < room.maxPlayers) {
                foundRoomCode = roomCode;
                break;
            }
        }

        if (foundRoomCode) {
            currentRoomCode = foundRoomCode;
            joinPlayerToRoom(socket, username, foundRoomCode);
        } else {
            currentRoomCode = createRoom(socket, username, true);
        }
    });

    socket.on('joinRoom', ({ username, roomCode }) => {
        const roomToJoin = roomCode.toUpperCase();
        if (!rooms[roomToJoin]) {
            return socket.emit('error', 'La sala no existe.');
        }
        if (joinPlayerToRoom(socket, username, roomToJoin)) {
            currentRoomCode = roomToJoin;
        }
    });

    socket.on('setGameMode', ({ roomCode, mode }) => {
        if (rooms[roomCode] && rooms[roomCode].host === socket.id) {
            rooms[roomCode].gameMode = mode;
            io.to(roomCode).emit('gameModeUpdated', mode);
        }
    });

    socket.on('setImpostorCount', ({ roomCode, count }) => {
        if (rooms[roomCode] && rooms[roomCode].host === socket.id) {
            rooms[roomCode].impostorCount = parseInt(count, 10);
        }
    });

    socket.on('setMaxPlayers', ({ roomCode, count }) => {
        if (rooms[roomCode] && rooms[roomCode].host === socket.id && rooms[roomCode].gameState === 'lobby') {
            rooms[roomCode].maxPlayers = parseInt(count, 10);
        }
    });

    socket.on('kickPlayer', ({ roomCode, playerId }) => {
        const room = rooms[roomCode];
        if (room && room.host === socket.id && room.gameState === 'lobby') {
            const playerToKick = room.players.find(p => p.id === playerId);
            const socketToKick = io.sockets.sockets.get(playerId);
            
            if (playerToKick && socketToKick) {
                socketToKick.emit('youWereKicked'); 
                socketToKick.leave(roomCode);
                room.players = room.players.filter(p => p.id !== playerId); 
                io.to(roomCode).emit('playerJoined', { players: room.players, host: room.host });
            }
        }
    });

    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode];
        if (!room || room.host !== socket.id || !room.gameMode) {
            return socket.emit('error', 'No se puede iniciar el juego.');
        }
        if (room.players.length < 3) {
            return socket.emit('error', 'Se necesitan al menos 3 jugadores para empezar.');
        }
        if (room.impostorCount >= room.players.length) {
            return socket.emit('error', 'Debe haber al menos un tripulante.');
        }

        room.gameState = 'playing';

        const categories = Object.keys(wordList);
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const words = wordList[randomCategory];
        room.secretWord = words[Math.floor(Math.random() * words.length)];

        room.impostorIds = [];
        const playersCopy = [...room.players];
        for (let i = 0; i < room.impostorCount; i++) {
            const index = Math.floor(Math.random() * playersCopy.length);
            room.impostorIds.push(playersCopy.splice(index, 1)[0].id);
        }

        room.playerOrder = shuffleArray(room.players.map(p => p.id));
        room.currentRound = 1;
        room.currentPlayerTurn = 0; 

        room.players.forEach(player => {
            player.isAlive = true; 
            let roleInfo = { category: randomCategory, mode: room.gameMode };
            let roleText = "";
            
            if (room.impostorIds.includes(player.id)) {
                roleInfo.word = "???";
                roleText = "¡Eres el IMPOSTOR!";
            } else {
                roleInfo.word = room.secretWord;
                roleText = "Eres un tripulante.";
            }
            roleInfo.role = roleText;
            io.to(player.id).emit('gameStarted', roleInfo);
        });
        
        startTurn(roomCode);
    });

    socket.on('chatMessage', ({ roomCode, message }) => {
        const room = rooms[roomCode];
        if (!room || room.gameMode !== 'Online') return;
        const player = room.players.find(p => p.id === socket.id);

        const livingPlayerIdsInOrder = getLivingPlayersInOrder(room).map(p => p.id);
        const currentPlayerId = livingPlayerIdsInOrder[room.currentPlayerTurn];

        if (socket.id !== currentPlayerId) {
            return socket.emit('error', 'No es tu turno de hablar.');
        }

        if (room.turnTimer) {
            clearTimeout(room.turnTimer);
            room.turnTimer = null;
        }

        if (player) {
            io.to(roomCode).emit('newChatMessage', { user: player.name, message: message });
            nextTurn(roomCode);
        }
    });

    socket.on('nextTurnIRL', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.gameMode !== 'IRL') return;
        
        const livingPlayerIdsInOrder = getLivingPlayersInOrder(room).map(p => p.id);
        const currentPlayerId = livingPlayerIdsInOrder[room.currentPlayerTurn];

        if (socket.id !== currentPlayerId) {
            return socket.emit('error', 'No es tu turno.');
        }

        const player = room.players.find(p => p.id === socket.id);
        io.to(roomCode).emit('newChatMessage', { user: 'SISTEMA', message: `${player.name} ha finalizado su turno.` });
        
        nextTurn(roomCode);
    });

    socket.on('submitVote', ({ roomCode, votedForId }) => {
        const room = rooms[roomCode];
        if (!room || room.gameState !== 'voting') return;

        const voter = room.players.find(p => p.id === socket.id);
        if (!voter || !voter.isAlive) {
            return socket.emit('error', 'Los muertos no pueden votar.');
        }

        room.votes[socket.id] = votedForId;
        socket.emit('voteReceived'); 

        const livingPlayers = getLivingPlayersInOrder(room).length;
        if (Object.keys(room.votes).length === livingPlayers) {
            tallyVotes(roomCode);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        let roomCode = null;
        for (const code in rooms) {
            if (rooms[code].players.some(p => p.id === socket.id)) {
                roomCode = code;
                break;
            }
        }
        
        if (!roomCode) return;
        
        currentRoomCode = roomCode;
        const room = rooms[currentRoomCode];
        
        const player = room.players.find(p => p.id === socket.id);
        room.players = room.players.filter(p => p.id !== socket.id);

        if (room.players.length === 0 && room.isPublic) {
            delete rooms[currentRoomCode];
            console.log(`Sala pública ${currentRoomCode} borrada por estar vacía.`);
            return;
        } else if (room.players.length === 0) {
            delete rooms[currentRoomCode];
            return;
        }
        
        if (room.host === socket.id) {
            room.host = room.players[0].id;
        }

        io.to(currentRoomCode).emit('playerLeft', { players: room.players, host: room.host });
        
        if (room.gameState !== 'lobby' && player && player.isAlive) {
            io.to(currentRoomCode).emit('newChatMessage', { user: 'SISTEMA', message: `${player.name} se ha desconectado.`});
            
            if (checkGameEnd(currentRoomCode)) return;

            const livingPlayerIds = getLivingPlayersInOrder(room).map(p => p.id);
            const livingPlayerIndex = livingPlayerIds.indexOf(socket.id);
            const livingPlayers = getLivingPlayersInOrder(room);
            if (room.currentPlayerTurn < livingPlayers.length) {
                 console.log("Jugador se fue en medio del turno. Recalculando.");
            }
        }
    });
});


function getLivingPlayersInOrder(room) {
    return room.playerOrder
        .map(id => room.players.find(p => p.id === id))
        .filter(player => player && player.isAlive);
}

function startTurn(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.gameState !== 'playing') return;

    const livingPlayers = getLivingPlayersInOrder(room);

    if (room.currentPlayerTurn >= livingPlayers.length) {
        if (livingPlayers.length === 0) {
            console.error("No hay jugadores vivos, terminando juego.");
            checkGameEnd(roomCode);
            return;
        }
        console.error("Error de índice de turno, reiniciando ronda.");
        return nextTurn(roomCode); 
    }
    
    const currentPlayer = livingPlayers[room.currentPlayerTurn];

    io.to(roomCode).emit('turnUpdate', { 
        currentPlayerName: currentPlayer.name, 
        round: room.currentRound,
        gameMode: room.gameMode
    });
    io.to(currentPlayer.id).emit('yourTurn', { gameMode: room.gameMode });

    if (room.gameMode === 'Online') {
        if (room.turnTimer) { clearTimeout(room.turnTimer); }
        
        const TIMER_DURATION = 90;
        io.to(roomCode).emit('timerUpdate', TIMER_DURATION); 

        room.turnTimer = setTimeout(() => {
            autoEjectPlayer(roomCode, currentPlayer.id);
        }, TIMER_DURATION * 1000);
    }
}

function autoEjectPlayer(roomCode, playerId) {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.isAlive) return; 

    player.isAlive = false;
    
    io.to(playerId).emit('youAreOut', { 
        role: room.impostorIds.includes(playerId) ? "¡Eras el IMPOSTOR!" : "Eras un tripulante."
    });
    
    io.to(roomCode).emit('newChatMessage', { 
        user: 'SISTEMA', 
        message: `${player.name} ha sido expulsado por tiempo.`
    });

    if (checkGameEnd(roomCode)) return;
    nextTurn(roomCode);
}

function nextTurn(roomCode) {
    const room = rooms[roomCode];
    if (!room || room.gameState !== 'playing') return;

    if (room.turnTimer) {
        clearTimeout(room.turnTimer);
        room.turnTimer = null;
    }
    
    room.currentPlayerTurn++; 

    const livingPlayers = getLivingPlayersInOrder(room);

    if (room.currentPlayerTurn >= livingPlayers.length) {
        room.currentPlayerTurn = 0;
        room.currentRound++;

        if (room.currentRound === 3 || room.currentRound > 3) {
            startVoting(roomCode);
        } else {
            io.to(roomCode).emit('newChatMessage', { 
                user: 'SISTEMA', 
                message: `--- Empezando Ronda ${room.currentRound} ---` 
            });
            startTurn(roomCode);
        }
    } else {
        startTurn(roomCode);
    }
}

function startVoting(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    room.gameState = 'voting';
    room.votes = {}; 

    const livingPlayers = getLivingPlayersInOrder(room);
    io.to(roomCode).emit('startVote', { players: livingPlayers });
}

function tallyVotes(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    const voteCounts = {};
    let maxVotes = 0;
    let playersToEject = [];

    room.players.forEach(p => { voteCounts[p.id] = 0; });

    for (const voterId in room.votes) {
        const votedForId = room.votes[voterId];
        if (voteCounts.hasOwnProperty(votedForId)) {
            voteCounts[votedForId]++;
        }
    }

    const livingPlayers = getLivingPlayersInOrder(room);
    livingPlayers.forEach(player => {
        const playerId = player.id;
        if (voteCounts[playerId] > maxVotes) {
            maxVotes = voteCounts[playerId];
            playersToEject = [playerId]; 
        } else if (voteCounts[playerId] === maxVotes && maxVotes > 0) {
            playersToEject.push(playerId); 
        }
    });

    let voteMessage = ""; 

    if (playersToEject.length > 1) {
        voteMessage = `¡Hubo un empate! Nadie es expulsado.`;
        io.to(roomCode).emit('voteResult', { message: voteMessage });
    } else if (playersToEject.length === 1) {
        const ejectedPlayerId = playersToEject[0];
        const ejectedPlayer = room.players.find(p => p.id === ejectedPlayerId);
        
        if (ejectedPlayer) {
            ejectedPlayer.isAlive = false;
            const wasImpostor = room.impostorIds.includes(ejectedPlayerId);
            
            io.to(ejectedPlayerId).emit('youAreOut', { 
                role: wasImpostor ? "¡Eras el IMPOSTOR!" : "Eras un tripulante."
            });

            voteMessage = `${ejectedPlayer.name} ha sido expulsado.`;
            io.to(roomCode).emit('voteResult', { 
                message: voteMessage,
                wasImpostor: wasImpostor
            });
        }
    } else {
        voteMessage = `Nadie recibió votos. El juego continúa.`;
        io.to(roomCode).emit('voteResult', { message: voteMessage });
    }
    
    io.to(roomCode).emit('newChatMessage', { user: 'SISTEMA', message: voteMessage });

    if (checkGameEnd(roomCode)) return; 

    room.gameState = 'playing';
    room.currentPlayerTurn = 0; 
    
    setTimeout(() => {
        io.to(roomCode).emit('newChatMessage', { 
            user: 'SISTEMA', 
            message: `--- Empezando Ronda ${room.currentRound} ---` 
        });
        startTurn(roomCode);
    }, 4000); 
}

function checkGameEnd(roomCode) {
    const room = rooms[roomCode];
    if (!room) return true;

    const livingPlayers = getLivingPlayersInOrder(room);
    const livingImpostors = livingPlayers.filter(p => room.impostorIds.includes(p.id));
    const livingCrewmates = livingPlayers.length - livingImpostors.length;

    let winner = null;

    if (livingPlayers.length > 0 && livingImpostors.length === 0) {
        winner = "Tripulación"; 
    } else if (livingImpostors.length >= livingCrewmates) {
        winner = "Impostores"; 
    }

    if (winner) {
        room.gameState = 'ended'; 
        const impostorNames = room.players
            .filter(p => room.impostorIds.includes(p.id))
            .map(p => p.name)
            .join(', ');
            
        io.to(roomCode).emit('gameEnd', { 
            winner: winner, 
            impostorNames: impostorNames 
        });
        
        setTimeout(() => {
            resetRoom(roomCode);
        }, 5000); 
        
        return true;
    }
    return false;
}

function resetRoom(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    room.gameState = 'lobby';
    room.secretWord = '';
    room.impostorIds = [];
    room.currentRound = 0;
    room.currentPlayerTurn = 0;
    room.playerOrder = [];
    room.votes = {};
    if (room.turnTimer) clearTimeout(room.turnTimer);
    
    room.players.forEach(p => {
        p.isAlive = true; 
    });
    
    io.to(roomCode).emit('backToLobby', { players: room.players, host: room.host });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});