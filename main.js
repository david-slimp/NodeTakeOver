// main.js

import {Game} from './game.js';
import {cfg} from './config.js';

let game;
let debugMode = false;

function initGame(seed = cfg.seed) {
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

    // Initialize the game with the configured default seed
    initGame(cfg.seed);
});
