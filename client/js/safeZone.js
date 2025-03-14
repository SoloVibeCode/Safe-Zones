class SafeZone {
    constructor(x, y, size, isCircle = true) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.isCircle = isCircle;
        console.log('SafeZone creada:', this); // Debug
    }

    draw(ctx) {
        if (!ctx) return;
        console.log('Dibujando SafeZone:', this); // Debug

        ctx.save();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 3;

        if (this.isCircle) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
            ctx.strokeRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        }

        ctx.restore();
    }

    isPlayerInside(player) {
        if (this.isCircle) {
            const dx = player.x + player.size/2 - this.x;
            const dy = player.y + player.size/2 - this.y;
            return Math.sqrt(dx*dx + dy*dy) <= this.size/2 - player.size/2;
        } else {
            return player.x >= this.x - this.size/2 &&
                   player.x + player.size <= this.x + this.size/2 &&
                   player.y >= this.y - this.size/2 &&
                   player.y + player.size <= this.y + this.size/2;
        }
    }
} 