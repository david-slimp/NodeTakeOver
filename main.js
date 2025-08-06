// main.js

import {Game} from './game.js';
import {cfg} from './config.js';

let game;
let debugMode = false;

function initGame(seed = null) {
    if (game) {
        // Save the current debug state before destroying the game
        debugMode = game.debugMode;
        game.destroy(); // Clean up any existing game state
    }
    game = new Game('gameCanvas', seed, debugMode);
    game.start();
}

document.addEventListener('DOMContentLoaded', () => {
    // Set the version number in the UI
    const versionElement = document.getElementById('versionNumber');
    if (versionElement) {
        versionElement.textContent = `v${cfg.VERSION}`;
    }

    // Show the restart button
    document.getElementById('restartButton').style.display = 'inline-block';

    // Initialize the game with the default seed
    const defaultSeed = parseInt(
        document.getElementById('seedInput').value,
        10,
    );
    initGame(defaultSeed);

    // Restart button logic
    document.getElementById('restartButton').addEventListener('click', () => {
        const seed = parseInt(document.getElementById('seedInput').value, 10);
        initGame(seed);
    });
});
