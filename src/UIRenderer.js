/**
 * UIRenderer - Handles all UI-related rendering and interactions
 */
export class UIRenderer {
    constructor() {
        this.overlay = this.createOverlay();
        this.hud = this.createHUD();
        this.statusText = this.createStatusElement('statusText', 'status-text');
        this.playerGoldElement = this.createStatusElement(
            'playerGold',
            'player-gold',
        );
        this.computerGoldElement = this.createStatusElement(
            'computerGold',
            'computer-gold',
        );
        this.seedInput = this.createSeedInput();
        this.restartButton = this.createRestartButton();
        this.restartCallback = null;
        this.setupSeedInputHandlers();
        this.initializeUI();
    }

    /**
     * Creates the main overlay element (used for game-over modal).
     */
    createOverlay() {
        const existing = document.getElementById('gameOverlay');
        const overlay = existing || document.createElement('div');
        overlay.id = 'gameOverlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
        `;
        if (!existing) {
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    /**
     * Creates a HUD container (always visible during play).
     */
    createHUD() {
        const existing = document.getElementById('gameHUD');
        const hud = existing || document.createElement('div');
        hud.id = 'gameHUD';
        hud.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
            gap: 10px 16px;
            margin: 10px 0;
            color: #fff;
            font-family: Arial, sans-serif;
        `;
        if (!existing) {
            const titleSection = document.getElementById('titleSection');
            if (titleSection && titleSection.parentNode) {
                titleSection.parentNode.insertBefore(hud, titleSection.nextSibling);
            } else {
                document.body.insertBefore(hud, document.body.firstChild);
            }
        }
        return hud;
    }

    /**
     * Creates a status element inside the HUD.
     */
    createStatusElement(id, className) {
        const existing = document.getElementById(id);
        const element = existing || document.createElement('div');
        element.id = id;
        element.className = className;
        element.style.margin = '0 6px';
        if (element.parentNode !== this.hud) {
            this.hud.appendChild(element);
        }
        return element;
    }

    /**
     * Creates the seed input element
     */
    createSeedInput() {
        const existing = document.getElementById('seedInput');
        if (existing) {
            return existing;
        }

        const container = document.createElement('div');
        container.style.margin = '0 6px';

        const label = document.createElement('label');
        label.htmlFor = 'seedInput';
        label.textContent = 'Seed: ';
        label.style.marginRight = '6px';

        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'seedInput';
        input.style.padding = '5px';
        input.placeholder = 'Enter seed (optional)';

        container.appendChild(label);
        container.appendChild(input);
        this.hud.appendChild(container);

        return input;
    }

    setupSeedInputHandlers() {
        this.seedInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.triggerRestart();
            }
        });
    }

    triggerRestart() {
        if (typeof this.restartCallback !== 'function') return;
        const seed = this.getSeed();
        this.hideOverlay();
        this.clearSeed();
        this.restartCallback(seed);
    }

    /**
     * Creates the restart button
     */
    createRestartButton() {
        const existing = document.getElementById('restartButton');
        const button = existing || document.createElement('button');
        button.id = 'restartButton';
        button.textContent = 'Restart (R)';
        button.style.cssText = `
            padding: 10px 20px;
            font-size: 18px;
            cursor: pointer;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            display: inline-block;
        `;
        if (button.parentNode !== this.hud) {
            this.hud.appendChild(button);
        }
        return button;
    }

    /**
     * Initializes the UI elements
     */
    initializeUI() {
        this.hideOverlay();
    }

    /**
     * Shows the game over screen
     * @param {string} message - The game over message
     * @param {number} playerGold - Player's gold amount
     * @param {number} computerGold - Computer's gold amount
     */
    showGameOver(message, playerGold, computerGold, suggestedSeed = null) {
        this.statusText.textContent = message;
        this.playerGoldElement.textContent = `Player Gold: ${playerGold}`;
        this.computerGoldElement.textContent = `Computer Gold: ${computerGold}`;
        this.restartButton.textContent = 'Go (Enter)';

        if (this.seedInput) {
            if (typeof suggestedSeed === 'number' && Number.isFinite(suggestedSeed)) {
                this.seedInput.value = String(suggestedSeed);
            }
        }
        // Temporarily render the HUD inside the overlay for game-over.
        if (this.hud.parentNode !== this.overlay) {
            this.overlay.appendChild(this.hud);
        }
        this.overlay.style.display = 'flex';

        // Focus the input for faster restart.
        if (this.seedInput) {
            this.seedInput.focus();
            this.seedInput.select?.();
        }
    }

    /**
     * Hides the overlay
     */
    hideOverlay() {
        this.overlay.style.display = 'none';
        // Put the HUD back into the normal document flow.
        if (this.hud.parentNode === this.overlay) {
            const titleSection = document.getElementById('titleSection');
            if (titleSection && titleSection.parentNode) {
                titleSection.parentNode.insertBefore(
                    this.hud,
                    titleSection.nextSibling,
                );
            } else {
                document.body.insertBefore(this.hud, document.body.firstChild);
            }
        }
    }

    /**
     * Gets the current seed value from the input
     * @returns {number|null} The seed value or null if empty/invalid
     */
    getSeed() {
        const raw = (this.seedInput.value ?? '').toString().trim();
        if (!raw) return null;
        const parsed = Number.parseInt(raw, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    /**
     * Clears the seed input
     */
    clearSeed() {
        this.seedInput.value = '';
    }

    /**
     * Sets up the restart callback
     * @param {Function} callback - Function to call when restart is requested
     */
    onRestart(callback) {
        this.restartCallback = callback;
        this.restartButton.onclick = () => this.triggerRestart();
    }

    /**
     * Sets up keyboard shortcuts
     * @param {Function} restartCallback - Function to call when restart is requested via keyboard
     */
    setupKeyboardShortcuts(restartCallback) {
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'r') {
                const seed = this.getSeed();
                this.hideOverlay();
                this.clearSeed();
                restartCallback(seed);
            }
        });
    }
}
