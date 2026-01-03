export class GameBase {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with id ${canvasId} not found`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.lastTime = 0;
        this.isRunning = false;
        this.animationFrameId = null;

        // Bind methods
        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);

        // Listeners
        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, { passive: false });
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    update(dt) {
        // Override me
        console.warn('Game update not implemented');
    }

    draw() {
        // Override me
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    handleInput(e) {
        e.preventDefault();
        // Normalize input coordinates
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        let x, y;
        if (e.type === 'touchstart') {
            x = (e.touches[0].clientX - rect.left) * scaleX;
            y = (e.touches[0].clientY - rect.top) * scaleY;
        } else {
            x = (e.clientX - rect.left) * scaleX;
            y = (e.clientY - rect.top) * scaleY;
        }

        this.onInput(x, y);
    }

    onInput(x, y) {
        console.log(`Input at ${x}, ${y}`);
    }
}
