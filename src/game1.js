import './css/style.css';
import { PullThePin } from './games/PullThePin.js';

console.log('Game 1 Initialized');

document.addEventListener('DOMContentLoaded', () => {
    const canvasId = 'game-canvas';
    const game = new PullThePin(canvasId);

    // Auto-start for now, or wait for user?
    // Let's start immediately but in a "waiting" state if possible, 
    // or just run it since we are on a dedicated page.
    game.start();

    // Restart Button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            game.reset(); // Need to ensure reset logic fully works
            // Maybe re-init level
        });
    }
});
