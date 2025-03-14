class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.players = new Map();
        this.safeZone = null;
        this.timer = 5;
        this.isRunning = false;
        this.selectedShape = null;
        this.isRestPhase = false;
        this.audioManager = new AudioManager();
        
        // Ajustar el tamaño del canvas
        this.canvas.width = 1000;
        this.canvas.height = 800;
        
        this.setupEventListeners();
        this.setupMenuListeners();

        // Añadir control de música para ambas pantallas
        this.setupMusicControls();

        this.setupMobileControls();
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    setupMenuListeners() {
        // Manejar selección de forma
        const shapeBtns = document.querySelectorAll('.shape-btn');
        shapeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remover selección previa
                shapeBtns.forEach(b => b.classList.remove('selected'));
                // Seleccionar nueva forma
                btn.classList.add('selected');
                this.selectedShape = btn.dataset.shape;
            });
        });

        // Manejar botón de unirse
        const joinBtn = document.getElementById('join-game');
        joinBtn.addEventListener('click', () => {
            if (!this.selectedShape) {
                alert('Please select a shape first');
                return;
            }

            // Unirse al juego y verificar que se ingresó el nombre
            if (socketClient.joinGame(this.selectedShape)) {
                // Ocultar pantalla de inicio y mostrar juego
                document.getElementById('start-screen').classList.add('hidden');
                document.getElementById('game-screen').classList.remove('hidden');
                this.start();
            }
        });

        // Manejar botón de volver al lobby
        const returnBtn = document.getElementById('return-lobby');
        returnBtn.addEventListener('click', () => {
            this.audioManager.playLobbyMusic();
            window.location.reload();
        });
    }

    handleKeyDown(event) {
        if (!this.isRunning) return;
        
        const player = this.players.get(socketClient.playerId);
        if (!player) return;

        switch(event.key) {
            case 'w':
            case 'ArrowUp':
                player.moveUp = true;
                break;
            case 's':
            case 'ArrowDown':
                player.moveDown = true;
                break;
            case 'a':
            case 'ArrowLeft':
                player.moveLeft = true;
                break;
            case 'd':
            case 'ArrowRight':
                player.moveRight = true;
                break;
            case 'q':
                player.rotateLeft = true;
                break;
            case 'e':
                player.rotateRight = true;
                break;
        }
    }

    handleKeyUp(event) {
        if (!this.isRunning) return;
        
        const player = this.players.get(socketClient.playerId);
        if (!player) return;

        switch(event.key) {
            case 'w':
            case 'ArrowUp':
                player.moveUp = false;
                break;
            case 's':
            case 'ArrowDown':
                player.moveDown = false;
                break;
            case 'a':
            case 'ArrowLeft':
                player.moveLeft = false;
                break;
            case 'd':
            case 'ArrowRight':
                player.moveRight = false;
                break;
            case 'q':
                player.rotateLeft = false;
                break;
            case 'e':
                player.rotateRight = false;
                break;
        }
    }

    start() {
        console.log('Starting game');
        this.isRunning = true;
        this.audioManager.playLobbyMusic();
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;

        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        for (const player of this.players.values()) {
            player.update();
            this.checkCollisions(player);
            
            // Enviar actualización al servidor si es nuestro jugador
            if (player.id === socketClient.playerId) {
                socketClient.sendPlayerUpdate(player);
            }
        }
    }

    render() {
        if (!this.ctx || !this.canvas) {
            console.error('Canvas o contexto no disponible');
            return;
        }

        // Limpiar el canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar fondo
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar zona segura
        if (this.safeZone && !this.isRestPhase) {
            console.log('Drawing safe zone:', this.safeZone);
            this.safeZone.draw(this.ctx);
            this.audioManager.playDangerMusic();
            const phaseIndicator = document.getElementById('phase-indicator');
            if (phaseIndicator) {
                phaseIndicator.textContent = 'Find the safe zone!';
                phaseIndicator.style.color = '#FF4444';
            }
        } else if (this.isRestPhase) {
            this.audioManager.playLobbyMusic();
            const phaseIndicator = document.getElementById('phase-indicator');
            if (phaseIndicator) {
                phaseIndicator.textContent = 'Rest phase';
                phaseIndicator.style.color = '#FFD700';
            }
        }

        // Dibujar jugadores
        console.log('Jugadores:', this.players); // Para debug
        for (const player of this.players.values()) {
            player.draw(this.ctx);
        }
    }

    checkCollisions(player) {
        // Colisiones con los bordes del mapa
        player.x = Math.max(0, Math.min(this.canvas.width - player.size, player.x));
        player.y = Math.max(0, Math.min(this.canvas.height - player.size, player.y));

        // Crear array de otros jugadores
        const otherPlayers = Array.from(this.players.values())
            .filter(p => p !== player);

        // Verificar colisiones con otros jugadores
        if (player.checkCollisions(otherPlayers)) {
            // Si hay colisión, reducir la velocidad temporalmente
            player.speed = player.speed * 0.8;
            
            // Restaurar la velocidad normal después de un breve momento
            setTimeout(() => {
                player.speed = 5;
            }, 100);
        }
    }

    checkPlayerCollision(player1, player2) {
        return player1.isColliding(player2);
    }

    setupMusicControls() {
        const musicToggles = ['music-toggle', 'start-music-toggle'];
        
        musicToggles.forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('click', () => {
                    if (this.audioManager.currentMusic) {
                        if (this.audioManager.currentMusic.volume > 0) {
                            this.audioManager.currentMusic.volume = 0;
                            // Actualizar ambos botones
                            musicToggles.forEach(toggleId => {
                                const btn = document.getElementById(toggleId);
                                if (btn) btn.textContent = '🔇';
                            });
                        } else {
                            this.audioManager.currentMusic.volume = 0.5;
                            // Actualizar ambos botones
                            musicToggles.forEach(toggleId => {
                                const btn = document.getElementById(toggleId);
                                if (btn) btn.textContent = '🔊';
                            });
                        }
                    }
                });
            }
        });
    }

    setupMobileControls() {
        if (!('ontouchstart' in window)) return;

        const joystickArea = document.querySelector('.joystick-area');
        const joystick = document.querySelector('.joystick');
        const rotateLeft = document.getElementById('rotate-left');
        const rotateRight = document.getElementById('rotate-right');

        let isDragging = false;
        let startX, startY;
        let currentX, currentY;

        const handleStart = (e) => {
            const touch = e.touches[0];
            isDragging = true;
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = startX;
            currentY = startY;
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            currentX = touch.clientX;
            currentY = touch.clientY;

            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            const angle = Math.atan2(deltaY, deltaX);
            const distance = Math.min(50, Math.sqrt(deltaX * deltaX + deltaY * deltaY));

            const joystickX = distance * Math.cos(angle);
            const joystickY = distance * Math.sin(angle);

            joystick.style.transform = `translate(${joystickX}px, ${joystickY}px)`;

            const player = this.players.get(socketClient.playerId);
            if (player) {
                player.moveLeft = deltaX < -20;
                player.moveRight = deltaX > 20;
                player.moveUp = deltaY < -20;
                player.moveDown = deltaY > 20;
            }
        };

        const handleEnd = () => {
            isDragging = false;
            joystick.style.transform = 'translate(-50%, -50%)';
            
            const player = this.players.get(socketClient.playerId);
            if (player) {
                player.moveLeft = false;
                player.moveRight = false;
                player.moveUp = false;
                player.moveDown = false;
            }
        };

        // Joystick events
        joystickArea.addEventListener('touchstart', handleStart);
        joystickArea.addEventListener('touchmove', handleMove);
        joystickArea.addEventListener('touchend', handleEnd);

        // Rotation buttons events
        rotateLeft.addEventListener('touchstart', () => {
            const player = this.players.get(socketClient.playerId);
            if (player) player.rotateLeft = true;
        });

        rotateLeft.addEventListener('touchend', () => {
            const player = this.players.get(socketClient.playerId);
            if (player) player.rotateLeft = false;
        });

        rotateRight.addEventListener('touchstart', () => {
            const player = this.players.get(socketClient.playerId);
            if (player) player.rotateRight = true;
        });

        rotateRight.addEventListener('touchend', () => {
            const player = this.players.get(socketClient.playerId);
            if (player) player.rotateRight = false;
        });

        // Prevent default touch behaviors
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }
}

const game = new Game(); 