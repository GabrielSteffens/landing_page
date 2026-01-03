import { Game } from './game.js?v=46';

window.addEventListener('DOMContentLoaded', () => {
    console.log("MAIN: DOMContentLoaded - v46");
    const container = document.getElementById('game-container');
    const game = new Game(container);

    // Menu Logic
    const menu = document.getElementById('main-menu');
    const btnNew = document.getElementById('btn-new-game');
    const btnLoad = document.getElementById('btn-load-game');
    const btnExport = document.getElementById('btn-export-save');
    const btnImport = document.getElementById('btn-import-save');
    const fileInput = document.getElementById('file-upload');

    // New Game
    btnNew.addEventListener('click', () => {
        console.log("MAIN: New Game Clicked");
        if (confirm("Are you sure? This will overwrite any auto-save!")) {
            console.log("MAIN: New Game Confirmed");
            menu.style.display = 'none';
            game.start(false); // False = New Game
        }
    });

    // Continue
    btnLoad.addEventListener('click', () => {
        console.log("MAIN: Continue Clicked");
        menu.style.display = 'none';
        game.start(true); // True = Load from Save
    });

    // Monitor Menu State
    setInterval(() => {
        const display = window.getComputedStyle(menu).display;
        const zIndex = window.getComputedStyle(menu).zIndex;
        console.log(`MONITOR: Menu Display=${display}, ZIndex=${zIndex}`);
    }, 2000);

    console.log("MAIN: Events set up. Menu should be visible.");

    // Export
    btnExport.addEventListener('click', () => {
        // We can export even before starting if save exists? 
        // SaveSystem is inside game. Let's start a temporary "load" just to export?
        // Or better: SaveSystem logic relies on game state. 
        // If game not started, state is empty. 
        // We really should load the save first to memory without starting renderer?
        // Let's assume user wants to export CURRENT save in LocalStorage.
        // But SaveSystem.export() serializes current game variables.
        // So we need to LOAD first implicitly.

        // Hack: Manually read local storage and download it directly?
        const json = localStorage.getItem('chicken_tycoon_save');
        if (json) {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'chicken_tycoon_save_backup.json';
            a.click();
            URL.revokeObjectURL(url);
        } else {
            alert("No save found to export!");
        }
    });

    // Import
    btnImport.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                // Validate JSON
                const data = JSON.parse(event.target.result);
                // Save to Storage
                localStorage.setItem('chicken_tycoon_save', JSON.stringify(data));
                alert("Save uploaded! Click 'Continue' to play.");
            } catch (err) {
                alert("Invalid Save File!");
                console.error(err);
            }
        };
        reader.readAsText(file);
    });

    // Don't auto start anymore!
    // game.start();
});
