import { GameBase } from './GameBase.js';

export class PullThePin extends GameBase {
    constructor(canvasId) {
        super(canvasId);
        this.currentLevelIdx = 0;
        this.reset();
    }

    reset() {
        this.balls = [];
        this.pins = [];
        this.walls = [];
        this.score = 0;
        this.state = 'playing'; // playing, won, lost
        this.levelCompleteTimer = 0;

        // Generate Level
        this.generateLevel(this.currentLevelIdx + 1);
    }

    generateLevel(levelNum) {
        console.log(`Generating Level ${levelNum}`);

        const difficulty = Math.min(levelNum, 20);
        const sections = Math.min(2 + Math.floor(levelNum / 5), 5); // Max 5 vertical sections

        this.walls = [];
        this.pins = [];
        this.balls = [];

        // Main Container
        const pad = 50;
        const w = 360;
        const h = 640;

        // Walls
        this.walls.push({ x: pad, y: 100, w: 10, h: h - 150 }); // Left
        this.walls.push({ x: w - pad - 10, y: 100, w: 10, h: h - 150 }); // Right
        this.walls.push({ x: pad, y: h - 50, w: w - pad * 2, h: 10 }); // Bottom Floor (Bucket)

        const sectionHeight = (h - 200) / sections;

        for (let i = 0; i < sections - 1; i++) {
            const y = 100 + (i + 1) * sectionHeight;

            if (Math.random() > 0.7 && difficulty > 5) {
                // Split pin 
                const gap = 20;
                const pinW = (w - pad * 2) / 2 - gap / 2;
                this.pins.push({ id: `p${i}a`, x: pad + 10, y: y, w: pinW, h: 10, active: true });
                this.pins.push({ id: `p${i}b`, x: w / 2 + gap / 2, y: y, w: pinW - 10, h: 10, active: true });
            } else {
                // Full pin
                this.pins.push({ id: `p${i}`, x: pad + 10, y: y, w: w - pad * 2 - 20, h: 10, active: true });
            }
        }

        // Spawn gold in top
        this.spawnBalls(10 + Math.floor(levelNum / 2), pad + 20, w - pad - 20, 120, 100 + sectionHeight - 20, 'gold');

        // Randomly spawn Grey balls OR Bombs in middle sections
        for (let i = 1; i < sections - 1; i++) {
            const yStart = 100 + i * sectionHeight + 20;
            const yEnd = 100 + (i + 1) * sectionHeight - 20;

            const roll = Math.random();
            // Higher level = more chance of bombs
            const bombChance = 0.1 + (levelNum * 0.02);

            if (roll < bombChance) {
                // BOMB SECTION
                this.spawnBalls(3 + Math.floor(levelNum / 4), pad + 20, w - pad - 20, yStart, yEnd, 'bomb');
            } else {
                // Grey Section
                this.spawnBalls(5 + Math.floor(levelNum / 3), pad + 20, w - pad - 20, yStart, yEnd, 'grey');
            }
        }
    }

    spawnBalls(count, xMin, xMax, yMin, yMax, type) {
        for (let i = 0; i < count; i++) {
            this.balls.push({
                x: xMin + Math.random() * (xMax - xMin),
                y: yMin + Math.random() * (yMax - yMin),
                r: 5,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                type: type,
                settled: false
            });
        }
    }

    update(dt) {
        if (this.state !== 'playing') {
            if (this.state === 'won') {
                this.levelCompleteTimer += dt;
                // Auto next level after 2 seconds
                if (this.levelCompleteTimer > 2) {
                    this.nextLevel();
                }
            }
            return;
        }

        const gravity = 800; // Increased Gravity (was 500)
        const steps = 2;
        const stepDt = dt / steps;

        for (let s = 0; s < steps; s++) {
            this.balls.forEach(ball => {
                ball.vy += gravity * stepDt;
                ball.x += ball.vx * stepDt;
                ball.y += ball.vy * stepDt;

                ball.vx *= 0.99;
                ball.vy *= 0.99;

                this.walls.forEach(w => this.resolveRectCollision(ball, w));

                this.pins.forEach(p => {
                    if (p.active) this.resolveRectCollision(ball, p);
                });
            });

            // Ball-Ball interaction
            for (let i = 0; i < this.balls.length; i++) {
                for (let j = i + 1; j < this.balls.length; j++) {
                    const b1 = this.balls[i];
                    const b2 = this.balls[j];
                    const dx = b2.x - b1.x;
                    const dy = b2.y - b1.y;
                    const distSq = dx * dx + dy * dy;
                    const minDist = b1.r + b2.r;

                    if (distSq < minDist * minDist) {
                        const dist = Math.sqrt(distSq);
                        const overlap = minDist - dist;
                        const nx = dx / dist;
                        const ny = dy / dist;

                        const moveX = nx * overlap * 0.5;
                        const moveY = ny * overlap * 0.5;

                        b1.x -= moveX;
                        b1.y -= moveY;
                        b2.x += moveX;
                        b2.y += moveY;

                        const k = 0.5;
                        b1.vx -= nx * k; b1.vy -= ny * k;
                        b2.vx += nx * k; b2.vy += ny * k;

                        // Conversion & BOMB Logic
                        this.handleBallInteraction(b1, b2);

                        if (this.state === 'lost') return; // Exit early if boom
                    }
                }
            }
            if (this.state === 'lost') break;
        }

        this.checkWinCondition();
    }

    handleBallInteraction(b1, b2) {
        // BOMB check
        if ((b1.type === 'bomb' && b2.type === 'gold') || (b2.type === 'bomb' && b1.type === 'gold')) {
            this.state = 'lost'; // Boom
            return;
        }

        // Bomb destroys grey? Maybe just harmless mix. 
        // For now, Bomb + Gold = DEAD.

        // Grey conversion
        if (b1.type === 'gold' && b2.type === 'grey') b2.type = 'gold';
        if (b2.type === 'gold' && b1.type === 'grey') b1.type = 'gold';
    }

    checkWinCondition() {
        if (this.state === 'lost') return;

        let inBucket = 0;
        let total = this.balls.length;
        let nonGoldInBucket = 0;
        let bombsInBucket = 0;

        // Bucket definition: y > 480 within walls
        this.balls.forEach(b => {
            if (b.y > 480 && b.x > 50 && b.x < 310) {
                inBucket++;
                if (b.type === 'bomb') {
                    bombsInBucket++;
                    // Bomb touching goal floor = LOSS?
                    // Let's say yes, you cannot let bombs reach goal.
                    this.state = 'lost';
                }
                if (b.type !== 'gold' && b.type !== 'bomb') nonGoldInBucket++;
            }
        });

        if (this.state === 'lost') return;

        // Win if majority in bucket and SAFE
        if (inBucket > total * 0.8) {
            if (nonGoldInBucket === 0 && bombsInBucket === 0) {
                this.state = 'won';
            }
        }
    }

    nextLevel() {
        this.currentLevelIdx++;
        this.reset();
    }

    resolveRectCollision(ball, rect) {
        const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
        const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));

        const dx = ball.x - closestX;
        const dy = ball.y - closestY;
        const distSq = dx * dx + dy * dy;

        if (distSq < ball.r * ball.r) {
            const dist = Math.sqrt(distSq);
            const overlap = ball.r - dist;

            if (dist === 0) {
                ball.y -= overlap;
                ball.vy = 0;
            } else {
                const nx = dx / dist;
                const ny = dy / dist;
                ball.x += nx * overlap;
                ball.y += ny * overlap;

                if (ny < 0 && ball.vy > 0) { // Floor
                    ball.vy *= -0.4;
                    ball.vx *= 0.95;
                } else {
                    ball.vx *= -0.5;
                    ball.vy *= 0.9;
                }
                if (Math.abs(ball.vy) < 5 && ny < 0) ball.vy = 0;
            }
        }
    }

    onInput(x, y) {
        if (this.state !== 'playing') {
            if (this.state === 'lost') this.reset(); // Click to restart
            return;
        }

        this.pins.forEach(p => {
            if (!p.active) return;
            const handleX = p.x + p.w + 12;
            const handleY = p.y + p.h / 2;
            const dist = Math.hypot(x - handleX, y - handleY);

            if (dist < 40) { // Large hit area for ease
                p.active = false;
            }
        });
    }

    // --- PIXEL ART DRAWING ---
    draw() {
        this.ctx.fillStyle = '#111'; // Pure dark BG
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Walls (Pixel blocks)
        this.ctx.fillStyle = '#555';
        this.walls.forEach(w => {
            // Pixelate wall
            this.ctx.fillRect(w.x, w.y, w.w, w.h);
            // Highlight logic for 3D effect
            this.ctx.fillStyle = '#777';
            this.ctx.fillRect(w.x, w.y, w.w, 4); // Top highlight
            this.ctx.fillStyle = '#555';
        });

        // Pins
        this.ctx.fillStyle = '#ff0055'; // Neon Pink
        this.pins.forEach(p => {
            if (p.active) {
                this.ctx.fillRect(p.x, p.y, p.w, p.h);
                // Handle (Square)
                this.ctx.fillStyle = '#ff99aa';
                this.ctx.fillRect(p.x + p.w, p.y - 5, 20, 20); // Square handle
                this.ctx.fillStyle = '#ff0055';
            }
        });

        // Balls (Square pixels)
        this.balls.forEach(b => {
            let color = '#888';
            if (b.type === 'gold') color = '#ffff00';
            if (b.type === 'bomb') color = '#ff0000'; // RED BOMB

            this.ctx.fillStyle = color;
            // Draw as square
            const size = b.r * 2;
            this.ctx.fillRect(b.x - b.r, b.y - b.r, size, size);

            // Bomb flash?
            if (b.type === 'bomb' && Math.floor(Date.now() / 200) % 2 === 0) {
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
            }
        });

        // UI
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px "Press Start 2P"';
        this.ctx.fillText(`LVL ${this.currentLevelIdx + 1}`, 20, 40);

        if (this.state === 'won') {
            this.ctx.fillStyle = '#00ff88';
            this.ctx.font = '30px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("NICE!", this.width / 2, this.height / 2);
            this.ctx.textAlign = 'left';
        } else if (this.state === 'lost') {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '30px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("FAIL", this.width / 2, this.height / 2);
            this.ctx.font = '15px "Press Start 2P"';
            this.ctx.fillText("CLICK TO RETRY", this.width / 2, this.height / 2 + 40);
            this.ctx.textAlign = 'left';
        }
    }
}
