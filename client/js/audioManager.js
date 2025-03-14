class AudioManager {
    constructor() {
        console.log('Initializing AudioManager');
        this.lobbyMusic = new Audio('/audio/lobby.mp3');
        this.dangerMusic = new Audio('/audio/danger.mp3');
        
        // Log cuando los archivos se cargan correctamente
        this.lobbyMusic.oncanplaythrough = () => {
            console.log('Lobby music loaded successfully');
            // Intentar reproducir la música cuando se cargue
            this.playLobbyMusic();
        };
        this.dangerMusic.oncanplaythrough = () => console.log('Danger music loaded successfully');
        
        // Log de errores detallado
        this.lobbyMusic.onerror = (e) => console.error('Error loading lobby music:', e);
        this.dangerMusic.onerror = (e) => console.error('Error loading danger music:', e);

        this.lobbyMusic.loop = true;
        this.dangerMusic.loop = true;
        this.lobbyMusic.volume = 0.5;
        this.dangerMusic.volume = 0.5;
        this.currentMusic = null;

        // Iniciar audio con cualquier interacción del usuario
        document.addEventListener('click', () => {
            console.log('User interaction detected, initializing audio');
            this.playLobbyMusic();
        }, { once: true });

        document.addEventListener('keydown', () => {
            console.log('Keyboard interaction detected, initializing audio');
            this.playLobbyMusic();
        }, { once: true });

        // Intentar reproducir inmediatamente (puede que no funcione hasta la interacción del usuario)
        this.initializeAudio();
    }

    initializeAudio() {
        const playAttempt = this.lobbyMusic.play();
        if (playAttempt) {
            playAttempt
                .then(() => {
                    console.log('Audio initialized successfully');
                    this.lobbyMusic.pause(); // Pausar inmediatamente
                })
                .catch(error => {
                    console.error('Audio initialization failed:', error);
                });
        }
    }

    async playLobbyMusic() {
        try {
            console.log('Attempting to play lobby music');
            if (this.currentMusic === this.lobbyMusic) return;
            
            const playPromise = this.lobbyMusic.play();
            if (playPromise) {
                await playPromise;
                console.log('Lobby music started');
                if (this.currentMusic) {
                    this.currentMusic.pause();
                }
                this.currentMusic = this.lobbyMusic;
            }
        } catch (error) {
            console.error('Error playing lobby music:', error);
        }
    }

    async playDangerMusic() {
        try {
            console.log('Attempting to play danger music');
            if (this.currentMusic === this.dangerMusic) return;
            
            const playPromise = this.dangerMusic.play();
            if (playPromise) {
                await playPromise;
                console.log('Danger music started');
                if (this.currentMusic) {
                    this.currentMusic.pause();
                }
                this.currentMusic = this.dangerMusic;
            }
        } catch (error) {
            console.error('Error playing danger music:', error);
        }
    }

    fadeIn(audio, duration = 1000) {
        audio.volume = 0;
        audio.play();
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const percentage = Math.min(progress / duration, 1);
            
            audio.volume = percentage * 0.5; // Max volume 0.5
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    fadeOut(audio, callback, duration = 1000) {
        const startVolume = audio.volume;
        let start = null;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const percentage = Math.min(progress / duration, 1);
            
            audio.volume = startVolume * (1 - percentage);
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                audio.pause();
                audio.volume = startVolume;
                if (callback) callback();
            }
        };
        
        requestAnimationFrame(animate);
    }

    stop() {
        if (this.currentMusic) {
            this.fadeOut(this.currentMusic);
            this.currentMusic = null;
        }
    }
} 