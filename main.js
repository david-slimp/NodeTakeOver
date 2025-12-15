// main.js

import {Game} from './game.js';
import {cfg} from './config.js';
import {UIRenderer} from './UIRenderer.js';

let game;
let debugMode = false;
const uiRenderer = new UIRenderer();

function initGame(seed = cfg.seed) {
    if (game) {
        // Save the current debug state before destroying the game
        debugMode = game.debugMode;
        game.destroy(); // Clean up any existing game state
    }
    game = new Game('gameCanvas', seed, debugMode, {uiRenderer});
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

    // Single restart path: UI triggers main.js to create the next Game instance.
    uiRenderer.onRestart((seed) => initGame(seed));
    uiRenderer.setupKeyboardShortcuts((seed) => initGame(seed));
});
