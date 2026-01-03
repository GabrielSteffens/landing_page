import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('game-container');
    const game = new Game(container);
    // Wait, the renderer is created in Game class. I need to check Game class in game.js
    game.start();
});
