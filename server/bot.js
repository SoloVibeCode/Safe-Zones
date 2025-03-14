class Bot {
    constructor(id, gameRoom, initialX, initialY) {
        this.id = id;
        this.gameRoom = gameRoom;
        this.x = initialX;
        this.y = initialY;
        this.shape = this.getRandomShape();
        this.color = this.getRandomColor();
        this.rotation = 0;
        this.size = 50;
        this.name = this.getRandomName();
        this.speed = 5;
        this.updateInterval = null;
        this.previousX = this.x;
        this.previousY = this.y;
        this.currentAngle = 0;
        this.angleChangeRate = 0.1;
        this.isInSafeZoneFlag = false;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.reactionTime = 0.7 + Math.random() * 0.8;
        this.lastDirectionChange = 0;
        this.avoidanceAngle = 0;
        this.avoidanceTime = 0;
        this.collisionCooldown = 0;
        this.lastCollisionPoint = null;
        this.insideSafeZone = false;
        this.wanderRadius = 300;
        this.centerX = 500;
        this.centerY = 400;
        this.targetAngle = Math.random() * Math.PI * 2;
        this.directionChangeInterval = 2000;
        this.lastDistance = null;
        this.stuckTime = 0;
    }

    getRandomName() {
        const names = [
            "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn",
            "Avery", "Parker", "Blake", "Charlie", "Skyler", "River", "Winter",
            "Storm", "Phoenix", "Rain", "Dawn", "Ash"
        ];
        const suffixes = ["Pro", "Gaming", "Player", "_", ""];
        return names[Math.floor(Math.random() * names.length)] + 
               suffixes[Math.floor(Math.random() * suffixes.length)] +
               Math.floor(Math.random() * 100);
    }

    getRandomShape() {
        const shapes = ['square', 'triangle', 'circle', 'line', 'pentagon'];
        return shapes[Math.floor(Math.random() * shapes.length)];
    }

    getRandomColor() {
        const hue = Math.random() * 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    start() {
        this.updateInterval = setInterval(() => this.update(), 1000 / 60);
    }

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    update() {
        this.previousX = this.x;
        this.previousY = this.y;

        if (!this.gameRoom.safeZone || this.gameRoom.isRestPhase) {
            this.wanderInCenter();
            return;
        }

        const inSafeZone = this.isInSafeZone();
        
        if (inSafeZone) {
            this.isInSafeZoneFlag = true;
            this.stayInSafeZone();
        } else if (!this.isInSafeZoneFlag) {
            this.moveTowardsSafeZone();
        } else {
            this.moveTowardsSafeZone();
        }

        this.handleCollisions();
    }

    isInSafeZone() {
        if (!this.gameRoom.safeZone) return true;

        const dx = this.x - this.gameRoom.safeZone.x;
        const dy = this.y - this.gameRoom.safeZone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= (this.gameRoom.safeZone.size / 2) - this.size;
    }

    wanderInCenter() {
        if (Math.random() < 0.02) {
            this.wanderAngle = Math.random() * Math.PI * 2;
        }

        const dx = this.x - 500;
        const dy = this.y - 400;
        const distanceToCenter = Math.sqrt(dx * dx + dy * dy);

        if (distanceToCenter > 250) {
            const angleToCenter = Math.atan2(400 - this.y, 500 - this.x);
            this.wanderAngle = this.wanderAngle * 0.8 + angleToCenter * 0.2;
        }

        this.x += Math.cos(this.wanderAngle) * this.speed * 0.5;
        this.y += Math.sin(this.wanderAngle) * this.speed * 0.5;

        this.rotation = this.wanderAngle;

        this.x = Math.max(0, Math.min(1000 - this.size, this.x));
        this.y = Math.max(0, Math.min(800 - this.size, this.y));

        if (this.handleCollisions()) {
            this.wanderAngle += Math.PI + (Math.random() - 0.5);
        }
    }

    stayInSafeZone() {
        const centerX = this.gameRoom.safeZone.x;
        const centerY = this.gameRoom.safeZone.y;
        const safeRadius = (this.gameRoom.safeZone.size / 2) - this.size;

        const dx = this.x - centerX;
        const dy = this.y - centerY;
        const distanceToCenter = Math.sqrt(dx * dx + dy * dy);

        if (distanceToCenter > safeRadius * 0.8) {
            const angle = Math.atan2(dy, dx);
            this.x = centerX + Math.cos(angle) * (safeRadius * 0.7);
            this.y = centerY + Math.sin(angle) * (safeRadius * 0.7);
        }
    }

    moveTowardsSafeZone() {
        const dx = this.gameRoom.safeZone.x - this.x;
        const dy = this.gameRoom.safeZone.y - this.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (this.avoidanceTime > 0) {
            this.x += Math.cos(this.avoidanceAngle) * this.speed;
            this.y += Math.sin(this.avoidanceAngle) * this.speed;
            this.avoidanceTime--;
            this.rotation = this.avoidanceAngle;
            return;
        }

        if (this.isStuck(distance)) {
            this.startRetreat(angle);
            return;
        }

        let moveAngle = angle;
        
        if (this.checkPotentialCollision(moveAngle)) {
            const alternatives = [
                angle + Math.PI / 2,
                angle - Math.PI / 2,
                angle + Math.PI,
                angle + Math.PI / 4,
                angle - Math.PI / 4
            ];
            
            let bestAngle = moveAngle;
            let bestScore = -Infinity;
            
            for (const alt of alternatives) {
                const score = this.evaluateMove(alt, distance);
                if (score > bestScore) {
                    bestScore = score;
                    bestAngle = alt;
                }
            }
            
            this.avoidanceAngle = bestAngle;
            this.avoidanceTime = 30;
            moveAngle = bestAngle;
        }

        this.currentAngle = this.smoothAngle(this.currentAngle, moveAngle, 0.2);

        if (this.avoidanceTime <= 0) {
            this.x += Math.cos(this.currentAngle) * this.speed;
            this.y += Math.sin(this.currentAngle) * this.speed;
            this.rotation = this.currentAngle;
        }

        this.x = Math.max(0, Math.min(1000 - this.size, this.x));
        this.y = Math.max(0, Math.min(800 - this.size, this.y));
    }

    isStuck(currentDistance) {
        if (!this.lastDistance) {
            this.lastDistance = currentDistance;
            this.stuckTime = 0;
            return false;
        }

        if (Math.abs(this.lastDistance - currentDistance) < 1) {
            this.stuckTime++;
            if (this.stuckTime > 60) {
                return true;
            }
        } else {
            this.stuckTime = 0;
        }

        this.lastDistance = currentDistance;
        return false;
    }

    startRetreat(targetAngle) {
        this.avoidanceAngle = targetAngle + Math.PI + (Math.random() - 0.5);
        this.avoidanceTime = 45;
        this.stuckTime = 0;
    }

    smoothAngle(current, target, factor) {
        let diff = target - current;
        
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        
        return current + diff * factor;
    }

    evaluateMove(angle, currentDistance) {
        const nextX = this.x + Math.cos(angle) * this.speed;
        const nextY = this.y + Math.sin(angle) * this.speed;
        
        const dx = this.gameRoom.safeZone.x - nextX;
        const dy = this.gameRoom.safeZone.y - nextY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);
        
        let collisionPenalty = 0;
        let nearestObstacleDistance = Infinity;

        for (const [id, bot] of this.gameRoom.bots) {
            if (id !== this.id) {
                const botDx = nextX - bot.x;
                const botDy = nextY - bot.y;
                const botDistance = Math.sqrt(botDx * botDx + botDy * botDy);
                nearestObstacleDistance = Math.min(nearestObstacleDistance, botDistance);
                if (botDistance < this.size * 2) {
                    collisionPenalty += (this.size * 2 - botDistance) * 2;
                }
            }
        }

        for (const player of this.gameRoom.players.values()) {
            const playerDx = nextX - player.x;
            const playerDy = nextY - player.y;
            const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
            if (playerDistance < this.size * 2) {
                collisionPenalty += (this.size * 2 - playerDistance);
            }
        }
        
        const progressScore = (currentDistance - newDistance) * 3;
        
        const obstacleScore = -collisionPenalty;
        
        const consistencyScore = Math.cos(angle - this.currentAngle) * 10;

        return progressScore + obstacleScore + consistencyScore;
    }

    checkPotentialCollision(angle) {
        const nextX = this.x + Math.cos(angle) * this.speed;
        const nextY = this.y + Math.sin(angle) * this.speed;
        
        for (const [id, bot] of this.gameRoom.bots) {
            if (id !== this.id) {
                const dx = nextX - bot.x;
                const dy = nextY - bot.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < this.size) {
                    return true;
                }
            }
        }
        
        for (const player of this.gameRoom.players.values()) {
            const dx = nextX - player.x;
            const dy = nextY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.size) {
                return true;
            }
        }
        
        return false;
    }

    handleCollisions() {
        let hasCollision = false;
        let collision = false;
        let nearestCollision = null;
        let minDistance = Infinity;

        for (const [id, bot] of this.gameRoom.bots) {
            if (id !== this.id && this.isColliding(bot)) {
                collision = true;
                hasCollision = true;
                const dist = this.getDistance(bot);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestCollision = bot;
                }
            }
        }

        for (const player of this.gameRoom.players.values()) {
            if (this.isColliding(player)) {
                collision = true;
                hasCollision = true;
                const dist = this.getDistance(player);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestCollision = player;
                }
            }
        }

        if (collision) {
            this.x = this.previousX;
            this.y = this.previousY;

            if (this.collisionCooldown <= 0) {
                if (nearestCollision) {
                    const angleToObstacle = Math.atan2(
                        nearestCollision.y - this.y,
                        nearestCollision.x - this.x
                    );
                    
                    const evasionDirection = Math.random() < 0.5 ? 1 : -1;
                    this.avoidanceAngle = angleToObstacle + (Math.PI / 2 * evasionDirection);
                    
                    this.avoidanceTime = 30 + Math.floor(Math.random() * 30);
                    this.collisionCooldown = 15;
                }
            }
        }

        return hasCollision;
    }

    getDistance(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    isColliding(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.size + other.size) / 2;
    }

    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            shape: this.shape,
            color: this.color,
            rotation: this.rotation,
            size: this.size,
            name: this.name
        };
    }
}

module.exports = Bot; 