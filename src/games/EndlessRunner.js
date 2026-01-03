import { GameBase } from './GameBase.js';

export class EndlessRunner extends GameBase {
    constructor(canvasId) {
        super(canvasId);
        this.reset();
    }

    reset() {
        this.player = {
            x: this.width / 2,
            y: this.height - 100,
            count: 1,
            radius: 10
        };
        this.gates = [];
        this.enemies = []; // Static Obstacles
        this.chasers = []; // NEW: Active Chasers
        this.bullets = [];
        this.scrollSpeed = 150;
        this.spawnTimer = 0;
        this.shootTimer = 0;
        this.state = 'playing';
    }

    update(dt) {
        if (this.state !== 'playing') return;

        // Increase speed
        this.scrollSpeed += dt * 5;

        // Player input
        if (this.targetX !== undefined) {
            this.player.x += (this.targetX - this.player.x) * 10 * dt;
        }
        this.player.x = Math.max(30, Math.min(this.width - 30, this.player.x));

        // Shooting Logic
        this.shootTimer += dt;
        if (this.shootTimer > 0.2) {
            this.bullets.push({
                x: this.player.x,
                y: this.player.y - 20,
                w: 4, h: 10,
                active: true
            });
            this.shootTimer = 0;
        }

        // Spawn Logic
        this.spawnTimer += dt;
        if (this.spawnTimer > 1.2) { // Slightly faster spawn overall
            const r = Math.random();
            if (r < 0.3) this.spawnGateRow();
            else if (r < 0.7) this.spawnObstacleRow();
            else this.spawnChaserWave(); // 30% chance of chasers

            this.spawnTimer = 0;
        }

        // Move Gates
        this.gates.forEach(g => g.y += this.scrollSpeed * dt);
        this.gates = this.gates.filter(g => g.y < this.height + 100);

        // Move Obstacles
        this.enemies.forEach(e => e.y += this.scrollSpeed * dt);
        this.enemies = this.enemies.filter(e => e.y < this.height + 100);

        // Move Chasers
        this.chasers.forEach(c => {
            c.y += (this.scrollSpeed + 50) * dt; // Run faster than scroll
            // Steer towards player
            const dx = this.player.x - c.x;
            c.x += dx * 2 * dt; // Steering strength
        });
        this.chasers = this.chasers.filter(c => c.y < this.height + 100);

        // Move Bullets
        this.bullets.forEach(b => b.y -= 500 * dt);
        this.bullets = this.bullets.filter(b => b.y > -50 && b.active);

        // Collision: Player vs Gates
        this.gates.forEach(g => {
            if (!g.passed && this.checkCollision(this.player, g)) {
                this.applyGate(g);
                g.passed = true;
            }
        });

        // Collision: Player vs Static Enemies
        this.enemies.forEach(e => {
            if (!e.hit && e.hp > 0 && this.checkCollision(this.player, e)) {
                this.player.count = Math.floor(this.player.count / 2) - 5;
                e.hit = true;
                e.hp = 0;
            }
        });

        // Collision: Player vs Chasers
        this.chasers.forEach(c => {
            if (!c.hit && c.hp > 0 && this.checkCollision(this.player, c)) {
                // Melee hit
                this.player.count -= 5; // Direct damage
                c.hit = true;
                c.hp = 0;
            }
        });

        // Collision: Bullets vs Enemies
        this.bullets.forEach(b => {
            if (!b.active) return;

            // Static
            this.enemies.forEach(e => {
                if (e.hp > 0 && this.checkRectOverlap(b, e)) {
                    e.hp--;
                    b.active = false;
                }
            });
            if (!b.active) return;

            // Chasers
            this.chasers.forEach(c => {
                if (c.hp > 0 && this.checkRectOverlap(b, c)) {
                    c.hp--;
                    b.active = false;
                }
            });
        });

        if (this.player.count < 1) {
            this.state = 'gameover';
        }
    }

    checkCollision(player, rect) {
        return (
            player.y < rect.y + rect.h &&
            player.y > rect.y &&
            Math.abs(player.x - (rect.x + rect.w / 2)) < rect.w / 2 + player.radius
        );
    }

    checkRectOverlap(r1, r2) {
        return (
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y
        );
    }

    spawnChaserWave() {
        // Spawn 3 chasers
        for (let i = 0; i < 3; i++) {
            this.chasers.push({
                x: Math.random() * this.width,
                y: -100 - (Math.random() * 100), // Staggered Y
                w: 20, h: 30, // Hitbox size
                hp: 1, // Die in 1 hit
                hit: false,
                color: '#ff0000'
            });
        }
    }

    spawnObstacleRow() {
        const isBoss = Math.random() < 0.1;
        const y = -100;

        if (isBoss) {
            this.enemies.push({
                x: 20, y: y,
                w: this.width - 40, h: 80,
                type: 'boss', hp: 20,
                hit: false, color: '#aa0000'
            });
        } else {
            const type = Math.random() > 0.5 ? 'spike' : 'block';
            const hp = type === 'block' ? 5 : 2;

            if (Math.random() > 0.5) {
                this.enemies.push({ x: this.width / 2 - 50, y: y, w: 100, h: 50, type: type, hp: hp, hit: false, color: '#ff0000' });
            } else {
                this.enemies.push({ x: 0, y: y, w: this.width / 2 - 40, h: 50, type: type, hp: hp, hit: false, color: '#ff0000' });
                this.enemies.push({ x: this.width / 2 + 40, y: y, w: this.width / 2 - 40, h: 50, type: type, hp: hp, hit: false, color: '#ff0000' });
            }
        }
    }

    spawnGateRow() {
        const y = -100;
        const w = this.width / 2 - 10;
        const op1 = Math.random() > 0.5 ? 'mul' : 'add';
        const val1 = op1 === 'mul' ? Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 20) + 5;

        this.gates.push({
            x: 5, y: y, w: w, h: 50,
            op: op1, val: val1, passed: false, color: '#00ff88'
        });

        const isBad = Math.random() > 0.3;
        const op2 = isBad ? (Math.random() > 0.5 ? 'div' : 'sub') : 'add';
        const val2 = op2 === 'div' ? 2 : Math.floor(Math.random() * 10) + 5;

        this.gates.push({
            x: this.width / 2 + 5, y: y, w: w, h: 50,
            op: op2, val: val2, passed: false, color: isBad ? '#ff0055' : '#00ff88'
        });
    }

    applyGate(gate) {
        if (gate.op === 'add') this.player.count += gate.val;
        if (gate.op === 'sub') this.player.count -= gate.val;
        if (gate.op === 'mul') this.player.count *= gate.val;
        if (gate.op === 'div') this.player.count = Math.floor(this.player.count / gate.val);
    }

    onInput(x, y) {
        this.targetX = x;
    }

    // --- PIXEL ART DRAWING ---
    drawPixelDude(x, y, scale, color) {
        const ms = Date.now();
        const bob = Math.floor(ms / 100) % 2;

        const p = 2 * scale;

        this.ctx.fillStyle = color;

        // Head 
        this.ctx.fillRect(x - 1.5 * p, y - 4 * p - bob * 2, 3 * p, 3 * p);

        // Body 
        this.ctx.fillRect(x - 1.5 * p, y - 1 * p - bob * 2, 3 * p, 2.5 * p);

        // Legs 
        const run = Math.floor(ms / 50) % 4;
        let ly, ry;
        if (run === 0) { ly = 0; ry = 0; }
        if (run === 1) { ly = -1; ry = 1; }
        if (run === 2) { ly = 0; ry = 0; }
        if (run === 3) { ly = 1; ry = -1; }

        this.ctx.fillRect(x - 1.5 * p, y + 1.5 * p - bob * 2 + ly, 1 * p, 2 * p);
        this.ctx.fillRect(x + 0.5 * p, y + 1.5 * p - bob * 2 + ry, 1 * p, 2 * p);

        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(x - 1.5 * p, y + 3.5 * p, 3 * p, 0.5 * p);
    }

    draw() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Grid (Neon)
        this.ctx.strokeStyle = '#330033';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        const gridOffset = (Date.now() / 5 % 40);
        for (let y = gridOffset; y < this.height; y += 40) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
        }
        for (let x = 0; x < this.width; x += 40) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
        }
        this.ctx.stroke();

        // Draw Static Obstacles
        this.enemies.forEach(e => {
            if (e.hp <= 0) return;

            this.ctx.fillStyle = e.color;
            if (e.hp < 3) this.ctx.fillStyle = Math.floor(Date.now() / 100) % 2 === 0 ? 'white' : e.color;

            this.ctx.fillRect(e.x, e.y, e.w, e.h);

            this.ctx.fillStyle = '#000';
            for (let i = 0; i < e.w; i += 20) {
                this.ctx.fillRect(e.x + i, e.y, 10, e.h);
            }

            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px "Press Start 2P"';
            this.ctx.fillText(e.hp, e.x + e.w / 2, e.y + e.h / 2);
        });

        // Draw Chasers
        this.chasers.forEach(c => {
            if (c.hp <= 0) return;
            // Draw as Red Pixel Dude
            this.drawPixelDude(c.x + c.w / 2, c.y + c.h, 1.5, '#ff0000');
        });

        // Draw Bullets
        this.ctx.fillStyle = '#ffff00';
        this.bullets.forEach(b => {
            this.ctx.fillRect(b.x, b.y, b.w, b.h);
        });

        // Draw Gates
        this.gates.forEach(g => {
            if (g.passed) return;
            const border = 4;
            this.ctx.fillStyle = g.color;
            this.ctx.fillRect(g.x, g.y, g.w, g.h);
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(g.x + border, g.y + border, g.w - border * 2, g.h - border * 2);

            this.ctx.fillStyle = g.color;
            this.ctx.font = '20px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            let txt = '';
            if (g.op === 'add') txt = `+${g.val}`;
            if (g.op === 'sub') txt = `-${g.val}`;
            if (g.op === 'mul') txt = `x${g.val}`;
            if (g.op === 'div') txt = `/${g.val}`;
            this.ctx.fillText(txt, g.x + g.w / 2, g.y + 35);
        });

        // Player
        const visualCount = Math.min(this.player.count, 50);

        this.drawPixelDude(this.player.x, this.player.y, 2.5, '#00e5ff');

        for (let i = 0; i < visualCount; i++) {
            const angle = (i / visualCount) * Math.PI * 2 + Date.now() / 100;
            const radius = 25 + (i % 3) * 10;
            const ox = Math.cos(angle) * radius;
            const oy = Math.sin(angle) * radius;

            const color = i % 2 === 0 ? '#00e5ff' : '#00bbaa';
            this.drawPixelDude(this.player.x + ox, this.player.y + oy, 1.2, color);
        }

        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.player.count, this.player.x, this.player.y - 45);

        if (this.state === 'gameover') {
            this.ctx.fillStyle = '#ff0055';
            this.ctx.font = '40px "Press Start 2P"';
            this.ctx.fillText("FAIL", this.width / 2, this.height / 2);
        }
    }
}
