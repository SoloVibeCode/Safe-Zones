class SafeZone {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = size/2; // El radio es la mitad del tamaño
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.fill();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.stroke();
    }

    isPlayerInside(player) {
        // Obtener el centro del jugador
        const centerX = player.x + player.size/2;
        const centerY = player.y + player.size/2;

        // Primero verificar si el jugador está completamente fuera (optimización)
        const centerDx = centerX - this.x;
        const centerDy = centerY - this.y;
        const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
        const maxRadius = (player.size * Math.SQRT2) / 2;

        // Ajustar la tolerancia según el tamaño del círculo
        const tolerance = this.radius < 100 ? 1.5 : 0.1;

        // Si está completamente fuera, retornar false
        if (centerDistance > this.radius + maxRadius) {
            return false;
        }

        // Si está completamente dentro con margen de seguridad, retornar true
        if (centerDistance + maxRadius < this.radius - tolerance) {
            return true;
        }

        // Para círculos pequeños, usar más puntos de verificación
        const numPoints = this.radius < 100 ? 64 : 32;
        const points = this.getDetailedPerimeterPoints(player, numPoints);

        // Para círculos pequeños, verificar más puntos interiores
        if (this.radius < 100) {
            const interiorPoints = this.getInteriorPoints(player, 12); // Más puntos interiores
            points.push(...interiorPoints);
        }

        // Verificar todos los puntos con tolerancia ajustada
        let pointsInside = 0;
        const totalPoints = points.length;

        for (const point of points) {
            const dx = point.x - this.x;
            const dy = point.y - this.y;
            if ((dx * dx + dy * dy) <= (this.radius * this.radius + tolerance)) {
                pointsInside++;
            }
        }

        // Para círculos pequeños, permitir un pequeño margen de error
        const requiredPercentage = this.radius < 100 ? 0.98 : 1.0;
        return (pointsInside / totalPoints) >= requiredPercentage;
    }

    getInteriorPoints(player, gridSize = 8) {
        const points = [];
        const centerX = player.x + player.size/2;
        const centerY = player.y + player.size/2;
        const radius = player.size / 2;

        // Añadir puntos en una cuadrícula interior más densa
        for (let i = -gridSize; i <= gridSize; i++) {
            for (let j = -gridSize; j <= gridSize; j++) {
                const x = centerX + (i * radius / gridSize);
                const y = centerY + (j * radius / gridSize);
                
                if (this.isPointInShape(x, y, player)) {
                    points.push({ x, y });
                }
            }
        }

        return points;
    }

    isPointInShape(x, y, player) {
        const centerX = player.x + player.size/2;
        const centerY = player.y + player.size/2;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) - player.rotation;

        switch(player.shape) {
            case 'square':
                const rotatedX = Math.cos(-player.rotation) * dx - Math.sin(-player.rotation) * dy;
                const rotatedY = Math.sin(-player.rotation) * dx + Math.cos(-player.rotation) * dy;
                return Math.abs(rotatedX) <= player.size/2 && Math.abs(rotatedY) <= player.size/2;

            case 'circle':
                return distance <= player.size/2;

            case 'triangle':
                const angleInTriangle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                return distance <= player.size/2 && angleInTriangle <= Math.PI * 2;

            case 'pentagon':
                return distance <= player.size/2;

            case 'line':
                const rotatedPoint = {
                    x: Math.cos(-player.rotation) * dx - Math.sin(-player.rotation) * dy,
                    y: Math.sin(-player.rotation) * dx + Math.cos(-player.rotation) * dy
                };
                return Math.abs(rotatedPoint.y) <= 2 && Math.abs(rotatedPoint.x) <= player.size/2;

            default:
                return false;
        }
    }

    getDetailedPerimeterPoints(player, numPoints) {
        const points = [];
        const centerX = player.x + player.size/2;
        const centerY = player.y + player.size/2;
        
        switch(player.shape) {
            case 'square':
                // Puntos en el perímetro
                for (let i = 0; i < numPoints; i++) {
                    const angle = (i * Math.PI * 2 / numPoints) + player.rotation;
                    const radius = player.size / 2;
                    
                    // Calcular el radio ajustado para el cuadrado
                    const absAngle = Math.abs((angle % (Math.PI/2)) - Math.PI/4);
                    const adjustedRadius = radius * Math.SQRT2 * Math.cos(absAngle);
                    
                    points.push({
                        x: centerX + Math.cos(angle) * adjustedRadius,
                        y: centerY + Math.sin(angle) * adjustedRadius
                    });
                }
                break;

            case 'triangle':
                // 24 puntos alrededor del triángulo
                for (let i = 0; i < 24; i++) {
                    const angle = (i * Math.PI * 2 / 24) + player.rotation;
                    const baseAngle = angle % (Math.PI * 2 / 3);
                    const normalizedAngle = baseAngle - Math.PI / 3;
                    const adjustedRadius = (player.size / 2) / Math.cos(normalizedAngle);
                    
                    points.push({
                        x: centerX + Math.cos(angle) * adjustedRadius,
                        y: centerY + Math.sin(angle) * adjustedRadius
                    });
                }
                break;

            case 'circle':
                // 32 puntos alrededor del círculo
                for (let i = 0; i < 32; i++) {
                    const angle = (i * Math.PI * 2 / 32) + player.rotation;
                    const radius = player.size / 2;
                    points.push({
                        x: centerX + Math.cos(angle) * radius,
                        y: centerY + Math.sin(angle) * radius
                    });
                }
                break;

            case 'pentagon':
                // 30 puntos alrededor del pentágono
                for (let i = 0; i < 30; i++) {
                    const angle = (i * Math.PI * 2 / 30) + player.rotation;
                    const baseAngle = angle % (Math.PI * 2 / 5);
                    const normalizedAngle = baseAngle - Math.PI / 5;
                    const adjustedRadius = (player.size / 2) / Math.cos(normalizedAngle);
                    
                    points.push({
                        x: centerX + Math.cos(angle) * adjustedRadius,
                        y: centerY + Math.sin(angle) * adjustedRadius
                    });
                }
                break;

            case 'line':
                // 8 puntos a lo largo de la línea
                const length = player.size;
                const angle = player.rotation;
                for (let i = 0; i <= 8; i++) {
                    const t = i / 8;
                    points.push({
                        x: centerX + Math.cos(angle) * length * (t - 0.5),
                        y: centerY + Math.sin(angle) * length * (t - 0.5)
                    });
                }
                break;
        }

        return points;
    }

    isPointInside(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return (dx * dx + dy * dy) <= (this.radius * this.radius);
    }
} 