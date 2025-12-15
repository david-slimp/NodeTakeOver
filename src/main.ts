import { Game } from './game';
import { cfg } from './config';
import { UIRenderer } from './UIRenderer';

let game: Game | null = null;
let debugMode = false;

const uiRenderer = new UIRenderer();

function initGame(seed: number | null = cfg.seed): void {
    if (game) {
        debugMode = game.debugMode;
        game.destroy();
    }
    game = new Game('gameCanvas', seed, debugMode, { uiRenderer });
    game.start();
}

document.addEventListener('DOMContentLoaded', () => {
    const versionElement = document.getElementById('versionNumber');
    if (versionElement) {
        versionElement.textContent = `v${cfg.VERSION}`;
    }

    initGame(cfg.seed);

    uiRenderer.onRestart((seed) => initGame(seed));
    uiRenderer.setupKeyboardShortcuts((seed) => initGame(seed));
});

