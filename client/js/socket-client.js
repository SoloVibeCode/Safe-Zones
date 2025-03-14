class SocketClient {
    constructor() {
        this.socket = io();
        this.playerId = null;
        this.playerNames = new Map(); // Para guardar los nombres de los jugadores
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Conectado al servidor');
            this.playerId = this.socket.id;
        });

        this.socket.on('gameState', (gameState) => {
            console.log('Recibido gameState:', gameState);
            if (gameState.safeZone && !game.safeZone) {
                game.safeZone = new SafeZone(
                    gameState.safeZone.x,
                    gameState.safeZone.y,
                    gameState.safeZone.size,
                    gameState.safeZone.isCircle
                );
            }
            this.updateGameState(gameState);
        });

        this.socket.on('newSafeZone', (zoneData) => {
            console.log('Nueva zona segura recibida:', zoneData);
            game.safeZone = new SafeZone(
                zoneData.x,
                zoneData.y,
                zoneData.size,
                zoneData.isCircle
            );
        });

        this.socket.on('playerEliminated', (playerId) => {
            game.players.delete(playerId);
            const playerName = this.playerNames.get(playerId) || 'Unknown player';
            this.showNotification(`${playerName} has been eliminated!`);
            this.playerNames.delete(playerId);
            if (playerId === this.playerId) {
                this.handleElimination();
            }
        });

        this.socket.on('gameOver', (winnerId) => {
            this.handleGameOver(winnerId);
        });

        this.socket.on('roomFull', () => {
            alert('The room is full (100 players maximum). Please try again later.');
            window.location.reload();
        });
    }

    updateGameState(gameState) {
        // Actualizar jugadores
        for (const playerData of gameState.players) {
            if (!game.players.has(playerData.id)) {
                const player = new Player(
                    playerData.id,
                    playerData.x,
                    playerData.y,
                    playerData.shape,
                    playerData.color,
                    playerData.name
                );
                game.players.set(playerData.id, player);
                this.playerNames.set(playerData.id, playerData.name);
            } else {
                const player = game.players.get(playerData.id);
                if (playerData.id !== this.playerId) {
                    player.x = playerData.x;
                    player.y = playerData.y;
                    player.rotation = playerData.rotation;
                    player.name = playerData.name;
                }
            }
        }

        // Limpiar jugadores que ya no están en el juego
        for (const [playerId] of game.players) {
            if (!gameState.players.find(p => p.id === playerId)) {
                game.players.delete(playerId);
            }
        }

        // Actualizar timer y estado
        game.timer = gameState.timer;
        game.isRestPhase = gameState.isRestPhase;
        
        // Actualizar UI
        const timerElement = document.getElementById('timer');
        timerElement.textContent = gameState.timer;
        if (gameState.isRestPhase) {
            timerElement.style.color = '#FFD700'; // Dorado para fase de descanso
        } else {
            timerElement.style.color = gameState.timer <= 3 ? '#FF0000' : '#FFFFFF'; // Rojo cuando queda poco tiempo
        }
        
        document.getElementById('players-count').textContent = 
            `Players: ${gameState.players.length}/100`;
    }

    handleElimination() {
        // Trackear eliminación
        gtag('event', 'player_eliminated', {
            player_id: this.playerId,
            time_survived: game.timer,
            players_remaining: game.players.size
        });

        const phaseIndicator = document.getElementById('phase-indicator');
        if (phaseIndicator) {
            phaseIndicator.textContent = 'You have been eliminated! You can keep watching...';
            phaseIndicator.style.color = '#FF0000';
        }
        game.audioManager.playLobbyMusic();
    }

    handleGameOver(winnerId) {
        // Trackear fin de partida
        gtag('event', 'game_over', {
            winner_id: winnerId,
            is_winner: winnerId === this.playerId,
            total_players: game.players.size + 1,
            game_duration: game.timer
        });

        let winnerText;
        if (winnerId === this.playerId) {
            winnerText = 'You won!';
        } else if (winnerId === null) {
            winnerText = 'Game Over - No players remaining';
        } else {
            winnerText = 'Game Over!';
        }
        
        // Volver a la música del lobby
        game.audioManager.playLobbyMusic();
        
        document.getElementById('winner-text').textContent = winnerText;
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('end-screen').classList.remove('hidden');
    }

    sendPlayerUpdate(player) {
        this.socket.emit('playerUpdate', {
            x: player.x,
            y: player.y,
            rotation: player.rotation,
            shape: player.shape,
            color: player.color
        });
    }

    joinGame(shape) {
        const nameInput = document.getElementById('player-name');
        const playerName = nameInput.value.trim();
        
        if (!playerName) {
            alert('Please enter your name');
            return false;
        }

        // Trackear nuevo jugador
        gtag('event', 'join_game', {
            player_name: playerName,
            shape: shape
        });

        // Crear jugador local inmediatamente
        const player = new Player(
            this.playerId,
            Math.random() * 900,
            Math.random() * 700,
            shape,
            '#FF0000',
            playerName
        );
        game.players.set(this.playerId, player);
        
        this.socket.emit('joinGame', { shape, name: playerName });
        return true;
    }

    showNotification(message) {
        const container = document.getElementById('notifications-container');
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Eliminar la notificación después de la animación
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

const socketClient = new SocketClient(); 