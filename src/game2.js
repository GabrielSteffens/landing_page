import './css/style.css';
import { EndlessRunner } from './games/EndlessRunner.js';

console.log('Game 2 Initialized');

document.addEventListener('DOMContentLoaded', () => {
    const canvasId = 'game-canvas';
    const game = new EndlessRunner(canvasId);

    game.start();

    // Restart Button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            game.reset();
        });
    }
});
