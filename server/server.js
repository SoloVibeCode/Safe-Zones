const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const GameRoom = require('./gameRoom');
const path = require('path');

// Servir archivos estáticos desde la carpeta client
app.use(express.static(path.join(__dirname, '../client')));

// Crear GameRoom con acceso a io
const gameRoom = new GameRoom(io);

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('joinGame', (data) => {
        if (gameRoom.players.size >= gameRoom.maxPlayers) {
            socket.emit('roomFull');
            return;
        }

        const success = gameRoom.addPlayer(socket.id, data.shape, data.name);
        if (!success) {
            socket.emit('roomFull');
            return;
        }
        
        // Iniciar el juego inmediatamente cuando se une un jugador
        if (!gameRoom.isGameRunning) {
            console.log('Iniciando juego con primer jugador...');
            gameRoom.startGame();
        }
    });

    socket.on('playerUpdate', (data) => {
        gameRoom.updatePlayer(socket.id, data);
    });

    socket.on('disconnect', () => {
        gameRoom.removePlayer(socket.id);
        console.log('Usuario desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
http.listen(PORT, HOST, () => {
    console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
    console.log(`Accede desde tu móvil usando: http://<tu-ip-local>:${PORT}`);
});

// Actualización del estado del juego
setInterval(() => {
    if (gameRoom.isGameRunning) {
        gameRoom.update();
        io.emit('gameState', gameRoom.getGameState());
    }
}, 1000 / 60); // 60 FPS 