class Player {
    constructor(id, x, y, shape, color, name = '') {
        this.id = id;
        this.x = x;
        this.y = y;
        this.previousX = x;
        this.previousY = y;
        this.shape = shape;
        this.color = color;
        this.size = 50;
        this.speed = 5;
        this.rotation = 0;
        this.rotationSpeed = 5;
        this.name = name;

        // Flags de movimiento
        this.moveUp = false;
        this.moveDown = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.rotateLeft = false;
        this.rotateRight = false;

        this.stuckTime = 0;
        this.lastPosition = { x, y };
    }

    update() {
        this.previousX = this.x;
        this.previousY = this.y;

        if (this.moveUp) this.y -= this.speed;
        if (this.moveDown) this.y += this.speed;
        if (this.moveLeft) this.x -= this.speed;
        if (this.moveRight) this.x += this.speed;
        
        // Verificar si el jugador está atascado
        const dx = this.x - this.lastPosition.x;
        const dy = this.y - this.lastPosition.y;
        const movement = Math.sqrt(dx * dx + dy * dy);

        if (movement < 0.1 && (this.moveUp || this.moveDown || this.moveLeft || this.moveRight)) {
            this.stuckTime++;
            if (this.stuckTime > 60) { // Si está atascado por más de 1 segundo
                // Aplicar un impulso aleatorio más fuerte
                this.x += (Math.random() - 0.5) * 10;
                this.y += (Math.random() - 0.5) * 10;
                this.stuckTime = 0;
            }
        } else {
            this.stuckTime = 0;
        }

        // Actualizar última posición
        this.lastPosition = { x: this.x, y: this.y };
        
        if (this.rotateLeft) this.rotation -= this.rotationSpeed;
        if (this.rotateRight) this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        if (!ctx) {
            console.error('Contexto no disponible');
            return;
        }

        // Guardar el estado actual del contexto
        ctx.save();
        
        // Trasladar al centro del jugador
        ctx.translate(this.x + this.size/2, this.y + this.size/2);
        ctx.rotate(this.rotation * Math.PI / 180);

        // Dibujar la forma del jugador
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();

        switch(this.shape) {
            case 'square':
                ctx.rect(-this.size/2, -this.size/2, this.size, this.size);
                break;
            case 'triangle':
                ctx.moveTo(-this.size/2, this.size/2);
                ctx.lineTo(this.size/2, this.size/2);
                ctx.lineTo(0, -this.size/2);
                break;
            case 'circle':
                ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
                break;
            case 'line':
                ctx.rect(-this.size/2, -this.size/8, this.size, this.size/4);
                break;
            case 'pentagon':
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 2 * Math.PI / 5) - Math.PI/2;
                    const x = Math.cos(angle) * this.size/2;
                    const y = Math.sin(angle) * this.size/2;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                break;
        }

        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Dibujar el nombre del jugador y el triángulo indicador
        ctx.save();
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Dibujar triángulo indicador si es el jugador principal
        if (this.id === socketClient.playerId) {
            ctx.beginPath();
            ctx.moveTo(this.x + this.size/2 - 10, this.y - 45); // Punto superior izquierdo
            ctx.lineTo(this.x + this.size/2 + 10, this.y - 45); // Punto superior derecho
            ctx.lineTo(this.x + this.size/2, this.y - 35); // Punto inferior
            ctx.closePath();
            ctx.fillStyle = '#FFD700'; // Color dorado
            ctx.strokeStyle = '#000000'; // Borde negro
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
        }

        // Sombra para el texto
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Dibujar el nombre
        ctx.fillStyle = 'white';
        ctx.fillText(this.name, this.x + this.size/2, this.y - 25); // Nombre más arriba
        
        ctx.restore();
    }

    isColliding(otherPlayer) {
        // Primero hacemos una comprobación rápida de bounding box
        if (!this.checkBoundingBoxCollision(otherPlayer)) {
            return false;
        }

        // Si pasa la primera comprobación, hacemos una más precisa según la forma
        return this.checkPreciseCollision(otherPlayer);
    }

    checkBoundingBoxCollision(other) {
        return this.x < other.x + other.size &&
               this.x + this.size > other.x &&
               this.y < other.y + other.size &&
               this.y + this.size > other.y;
    }

    checkPreciseCollision(other) {
        // Obtener los puntos de cada forma
        const points1 = this.getShapePoints();
        const points2 = other.getShapePoints();

        // Para círculos usamos una comprobación especial
        if (this.shape === 'circle' || other.shape === 'circle') {
            return this.checkCircleCollision(other);
        }

        // Para otras formas usamos el algoritmo de separación de ejes (SAT)
        return this.checkPolygonCollision(points1, points2);
    }

    getShapePoints() {
        const points = [];
        const centerX = this.x + this.size/2;
        const centerY = this.y + this.size/2;
        const angle = this.rotation * Math.PI / 180;

        switch(this.shape) {
            case 'square':
                points.push(this.rotatePoint(centerX - this.size/2, centerY - this.size/2, centerX, centerY, angle));
                points.push(this.rotatePoint(centerX + this.size/2, centerY - this.size/2, centerX, centerY, angle));
                points.push(this.rotatePoint(centerX + this.size/2, centerY + this.size/2, centerX, centerY, angle));
                points.push(this.rotatePoint(centerX - this.size/2, centerY + this.size/2, centerX, centerY, angle));
                break;

            case 'triangle':
                points.push(this.rotatePoint(centerX, centerY - this.size/2, centerX, centerY, angle));
                points.push(this.rotatePoint(centerX - this.size/2, centerY + this.size/2, centerX, centerY, angle));
                points.push(this.rotatePoint(centerX + this.size/2, centerY + this.size/2, centerX, centerY, angle));
                break;

            case 'line':
                points.push(this.rotatePoint(centerX - this.size/2, centerY - this.size/8, centerX, centerY, angle));
                points.push(this.rotatePoint(centerX + this.size/2, centerY - this.size/8, centerX, centerY, angle));
                points.push(this.rotatePoint(centerX + this.size/2, centerY + this.size/8, centerX, centerY, angle));
                points.push(this.rotatePoint(centerX - this.size/2, centerY + this.size/8, centerX, centerY, angle));
                break;

            case 'pentagon':
                for (let i = 0; i < 5; i++) {
                    const a = (i * 2 * Math.PI / 5) - Math.PI/2 + angle;
                    points.push({
                        x: centerX + Math.cos(a) * this.size/2,
                        y: centerY + Math.sin(a) * this.size/2
                    });
                }
                break;
        }
        return points;
    }

    rotatePoint(x, y, cx, cy, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: (x - cx) * cos - (y - cy) * sin + cx,
            y: (x - cx) * sin + (y - cy) * cos + cy
        };
    }

    checkCircleCollision(other) {
        const dx = (this.x + this.size/2) - (other.x + other.size/2);
        const dy = (this.y + this.size/2) - (other.y + other.size/2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (this.shape === 'circle' && other.shape === 'circle') {
            return distance < this.size/2 + other.size/2;
        }

        // Si solo uno es círculo, comprobamos contra los puntos del polígono
        const circle = this.shape === 'circle' ? this : other;
        const polygon = this.shape === 'circle' ? other : this;
        const polygonPoints = polygon.getShapePoints();

        // Comprobar distancia del centro del círculo a cada línea del polígono
        return this.checkCirclePolygonCollision(circle, polygonPoints);
    }

    checkCirclePolygonCollision(circle, points) {
        const centerX = circle.x + circle.size/2;
        const centerY = circle.y + circle.size/2;
        const radius = circle.size/2;

        for (let i = 0; i < points.length; i++) {
            const start = points[i];
            const end = points[(i + 1) % points.length];
            
            const distance = this.pointToLineDistance(centerX, centerY, start.x, start.y, end.x, end.y);
            if (distance < radius) return true;
        }
        return false;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    checkPolygonCollision(points1, points2) {
        // Implementación del algoritmo SAT (Separating Axis Theorem)
        const edges = this.getEdgeVectors(points1).concat(this.getEdgeVectors(points2));
        
        for (const edge of edges) {
            const axis = this.normalize({ x: -edge.y, y: edge.x });
            const projection1 = this.projectPolygon(points1, axis);
            const projection2 = this.projectPolygon(points2, axis);
            
            if (!this.overlaps(projection1, projection2)) {
                return false;
            }
        }
        return true;
    }

    getEdgeVectors(points) {
        const edges = [];
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            edges.push({ x: p2.x - p1.x, y: p2.y - p1.y });
        }
        return edges;
    }

    normalize(vector) {
        const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        return { x: vector.x / length, y: vector.y / length };
    }

    projectPolygon(points, axis) {
        let min = Infinity;
        let max = -Infinity;
        
        for (const point of points) {
            const projection = point.x * axis.x + point.y * axis.y;
            min = Math.min(min, projection);
            max = Math.max(max, projection);
        }
        
        return { min, max };
    }

    overlaps(projection1, projection2) {
        return projection1.max >= projection2.min && projection2.max >= projection1.min;
    }

    checkCollisions(otherPlayers) {
        let hasCollision = false;
        const pushForce = 2; // Fuerza con la que los jugadores se empujan

        for (const other of otherPlayers) {
            if (other.id === this.id) continue;

            if (this.isColliding(other)) {
                hasCollision = true;

                // Calcular el vector de separación
                const dx = this.x + this.size/2 - (other.x + other.size/2);
                const dy = this.y + this.size/2 - (other.y + other.size/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 1) continue; // Evitar división por cero

                // Normalizar el vector
                const nx = dx / distance;
                const ny = dy / distance;

                // Calcular la superposición
                const overlap = (this.size + other.size) / 2 - distance;

                if (overlap > 0) {
                    // Empujar a ambos jugadores en direcciones opuestas
                    this.x += nx * overlap/2 * pushForce;
                    this.y += ny * overlap/2 * pushForce;

                    // Aplicar límites del mapa después de la corrección
                    this.x = Math.max(0, Math.min(1000 - this.size, this.x));
                    this.y = Math.max(0, Math.min(800 - this.size, this.y));

                    // Añadir un pequeño impulso aleatorio para evitar bloqueos
                    if (Math.random() < 0.1) {
                        this.x += (Math.random() - 0.5) * 2;
                        this.y += (Math.random() - 0.5) * 2;
                    }
                }
            }
        }

        return hasCollision;
    }
} 