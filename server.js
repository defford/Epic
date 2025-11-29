const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
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
app.use(express.static(__dirname));

// Game rooms storage
const rooms = new Map();

// Generate random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create or join room
function createOrJoinRoom(socket, roomCode) {
    if (!roomCode) {
        // Create new room
        roomCode = generateRoomCode();
        rooms.set(roomCode, {
            players: [],
            gameState: null,
            currentPlayer: 1
        });
    }
    
    const room = rooms.get(roomCode);
    if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return null;
    }
    
    if (room.players.length >= 2) {
        socket.emit('error', { message: 'Room is full' });
        return null;
    }
    
    // Add player to room
    const playerNumber = room.players.length === 0 ? (Math.random() < 0.5 ? 1 : 2) : (room.players[0].playerNumber === 1 ? 2 : 1);
    const player = {
        id: socket.id,
        playerNumber: playerNumber,
        ready: false
    };
    
    room.players.push(player);
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerNumber = playerNumber;
    
    return { roomCode, playerNumber, room };
}

io.on('connection', (socket) => {
    // Create or join room
    socket.on('createRoom', () => {
        const result = createOrJoinRoom(socket);
        if (result) {
            socket.emit('roomCreated', { 
                roomCode: result.roomCode, 
                playerNumber: result.playerNumber 
            });
            io.to(result.roomCode).emit('roomUpdate', {
                players: result.room.players.length,
                playerNumbers: result.room.players.map(p => p.playerNumber)
            });
        }
    });
    
    socket.on('joinRoom', (data) => {
        const { roomCode } = data;
        const result = createOrJoinRoom(socket, roomCode);
        if (result) {
            socket.emit('roomJoined', { 
                roomCode: result.roomCode, 
                playerNumber: result.playerNumber 
            });
            io.to(result.roomCode).emit('roomUpdate', {
                players: result.room.players.length,
                playerNumbers: result.room.players.map(p => p.playerNumber)
            });
        }
    });
    
    // Player ready
    socket.on('playerReady', () => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.ready = true;
        }
        
        // Check if both players are ready
        if (room.players.length === 2 && room.players.every(p => p.ready)) {
            io.to(socket.roomCode).emit('gameStart', {
                playerNumbers: room.players.map(p => ({ id: p.id, playerNumber: p.playerNumber }))
            });
        } else {
            io.to(socket.roomCode).emit('roomUpdate', {
                players: room.players.length,
                playerNumbers: room.players.map(p => p.playerNumber),
                readyCount: room.players.filter(p => p.ready).length
            });
        }
    });
    
    // Game actions
    socket.on('gameAction', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        
        // Broadcast action to other players in room (excluding sender)
        socket.to(socket.roomCode).emit('gameAction', {
            ...data,
            playerNumber: socket.playerNumber
        });
    });
    
    socket.on('gameStateUpdate', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        
        room.gameState = data;
        // Broadcast state to other players
        socket.to(socket.roomCode).emit('gameStateUpdate', data);
    });
    
    // Player resignation
    socket.on('playerResigned', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        
        // Broadcast resignation to other players in room
        socket.to(socket.roomCode).emit('playerResigned', {
            resignedPlayer: socket.playerNumber
        });
    });
    
    // Rematch request
    socket.on('rematchRequest', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        
        // Broadcast rematch request to other players in room
        socket.to(socket.roomCode).emit('rematchRequest', {
            requestingPlayer: socket.playerNumber
        });
    });
    
    // Rematch accepted
    socket.on('rematchAccepted', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        
        // Broadcast rematch acceptance to other players in room
        socket.to(socket.roomCode).emit('rematchAccepted', {
            acceptingPlayer: socket.playerNumber
        });
    });
    
    // Game over
    socket.on('gameOver', (data) => {
        const room = rooms.get(socket.roomCode);
        if (!room) return;
        
        // Broadcast game over to other players in room
        socket.to(socket.roomCode).emit('gameOver', {
            winner: data.winner,
            reason: data.reason
        });
    });
    
    // Disconnect
    socket.on('disconnect', () => {
        const room = rooms.get(socket.roomCode);
        if (room) {
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                rooms.delete(socket.roomCode);
            } else {
                io.to(socket.roomCode).emit('roomUpdate', {
                    players: room.players.length,
                    playerNumbers: room.players.map(p => p.playerNumber),
                    playerLeft: true
                });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
});

