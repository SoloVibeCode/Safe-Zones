const Bot = require('./bot');

class GameRoom {
    constructor(io) {
        this.io = io;
        this.players = new Map();
        this.bots = new Map();
        this.safeZone = null;
        this.timer = 5;
        this.isGameRunning = false;
        this.zoneInterval = null;
        this.maxPlayers = 100;
        this.colors = this.generateColors(100);
        this.isRestPhase = false;
        this.zoneSize = 300;
        this.zoneShrinkAmount = 30;
        this.minPlayers = 1;
        this.phaseTime = 5;

        // Añadir bots iniciales
        this.addInitialBots();
    }

    generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const hue = (i * 360 / count) % 360;
            const saturation = 70 + Math.random() * 30;
            const lightness = 45 + Math.random() * 10;
            colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        }
        return colors;
    }

    addPlayer(id, shape, name) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }

        const color = this.colors[this.players.size % this.colors.length];
        const player = {
            id,
            x: Math.random() * 900,
            y: Math.random() * 700,
            shape,
            color,
            rotation: 0,
            size: 50,
            name
        };
        this.players.set(id, player);
        this.io.emit('gameState', this.getGameState());
        return true;
    }

    removePlayer(id) {
        this.players.delete(id);
        if (this.players.size === 0 && this.isGameRunning) {
            this.endGame();
        }
    }

    updatePlayer(id, data) {
        const player = this.players.get(id);
        if (player) {
            player.x = data.x;
            player.y = data.y;
            player.rotation = data.rotation;
        }
    }

    canStartGame() {
        return true;
    }

    startGame() {
        console.log('Starting game in GameRoom...');
        this.isGameRunning = true;
        this.zoneSize = 300;
        this.isRestPhase = false;
        this.timer = this.phaseTime;
        
        // Limpiar bots existentes
        for (const [id, bot] of this.bots.entries()) {
            bot.stop();
        }
        this.bots.clear();
        
        // Generar nuevos bots para esta partida
        this.addInitialBots();
        
        if (this.zoneInterval) {
            clearInterval(this.zoneInterval);
        }

        this.createNewSafeZone();

        this.zoneInterval = setInterval(() => {
            this.timer--;
            console.log('Timer:', this.timer, 'RestPhase:', this.isRestPhase);
            
            this.io.emit('gameState', this.getGameState());
            
            if (this.timer <= 0) {
                if (this.isRestPhase) {
                    console.log('End of rest phase - Creating new zone');
                    this.isRestPhase = false;
                    this.timer = this.phaseTime;
                    this.zoneSize = Math.max(50, this.zoneSize - this.zoneShrinkAmount);
                    this.createNewSafeZone();
                } else {
                    console.log('End of active phase - Starting rest');
                    this.checkPlayersInZone();
                    this.safeZone = null;
                    this.isRestPhase = true;
                    this.timer = this.phaseTime;
                }
            }
        }, 1000);
    }

    createNewSafeZone() {
        console.log('Creating new safe zone...');
        const newZone = {
            x: Math.random() * (1000 - this.zoneSize) + this.zoneSize/2,
            y: Math.random() * (800 - this.zoneSize) + this.zoneSize/2,
            size: this.zoneSize,
            isCircle: true
        };
        this.safeZone = newZone;
        console.log('New zone created:', newZone);
        this.io.emit('newSafeZone', newZone);
    }

    checkPlayersInZone() {
        console.log('Verificando jugadores en zona segura...');
        // Verificar jugadores reales
        for (const [id, player] of this.players.entries()) {
            if (!this.isPlayerInSafeZone(player)) {
                console.log(`Jugador ${player.name} eliminado por estar fuera de la zona`);
                this.players.delete(id);
                this.io.emit('playerEliminated', id);
            }
        }

        // Verificar bots
        for (const [id, bot] of this.bots.entries()) {
            if (!this.isPlayerInSafeZone(bot)) {
                console.log(`Bot ${bot.name} eliminado por estar fuera de la zona`);
                this.bots.delete(id);
                bot.stop();
                this.io.emit('playerEliminated', id);
            }
        }

        console.log(`Jugadores restantes: ${this.players.size}, Bots restantes: ${this.bots.size}`);

        if (this.players.size === 0 && this.bots.size === 0) {
            this.endGame();
        }
    }

    isPlayerInSafeZone(player) {
        if (!this.safeZone) return true;

        if (this.safeZone.isCircle) {
            const dx = player.x - this.safeZone.x;
            const dy = player.y - this.safeZone.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            const playerRadius = player.size / 2;
            // El jugador debe estar completamente dentro de la zona
            return distance + playerRadius <= this.safeZone.size/2;
        } else {
            return player.x >= this.safeZone.x - this.safeZone.size/2 &&
                   player.x <= this.safeZone.x + this.safeZone.size/2 &&
                   player.y >= this.safeZone.y - this.safeZone.size/2 &&
                   player.y <= this.safeZone.y + this.safeZone.size/2;
        }
    }

    endGame(winnerId = null) {
        console.log('Game Over. Remaining players:', this.players.size);
        this.isGameRunning = false;
        clearInterval(this.zoneInterval);
        this.safeZone = null;
        this.io.emit('gameOver', winnerId);
    }

    getGameState() {
        return {
            players: [
                ...Array.from(this.players.values()),
                ...Array.from(this.bots.values()).map(bot => bot.getState())
            ],
            timer: this.timer,
            safeZone: this.safeZone,
            isRestPhase: this.isRestPhase
        };
    }

    update() {
        // Aquí puedes agregar lógica adicional de actualización del juego
    }

    addInitialBots() {
        // Número aleatorio de bots entre 6 y 12
        const numBots = Math.floor(Math.random() * 7) + 6;
        console.log(`Adding ${numBots} bots to the game`);

        // Distribuir bots por todo el mapa
        const positions = [];
        const mapWidth = 1000;
        const mapHeight = 800;
        const margin = 100; // Margen desde los bordes
        const gridSize = 5; // 5x5 grid para más dispersión
        
        // Dividir el mapa en secciones
        const sectionWidth = (mapWidth - margin * 2) / gridSize;
        const sectionHeight = (mapHeight - margin * 2) / gridSize;

        // Generar posiciones en cuadrícula
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                // Posición base de la sección
                const baseX = margin + col * sectionWidth;
                const baseY = margin + row * sectionHeight;
                
                // Posición aleatoria dentro de la sección
                positions.push({
                    x: baseX + Math.random() * (sectionWidth * 0.8),
                    y: baseY + Math.random() * (sectionHeight * 0.8)
                });
            }
        }

        // Mezclar las posiciones
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        // Crear los bots usando las primeras numBots posiciones
        for (let i = 0; i < numBots; i++) {
            const botId = `bot-${Date.now()}-${i}`;
            const bot = new Bot(botId, this, positions[i].x, positions[i].y);
            this.bots.set(botId, bot);
            bot.start();
        }
    }
}

module.exports = GameRoom; 