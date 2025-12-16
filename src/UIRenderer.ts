/**
 * UIRenderer - Handles all UI-related rendering and interactions
 */
export class UIRenderer {
    overlay: HTMLDivElement;
    modal: HTMLDivElement;
    hud: HTMLDivElement;
    statusText: HTMLDivElement;
    playerGoldElement: HTMLDivElement;
    computerGoldElement: HTMLDivElement;
    seedField: HTMLDivElement;
    seedInput: HTMLInputElement;
    restartButton: HTMLButtonElement;
    restartCallback: ((seed: number | null) => void) | null;

    constructor() {
        this.ensureAppShell();
        this.overlay = this.createOverlay();
        this.modal = this.createModal();
        this.hud = this.createHUD();
        this.statusText = this.createStatusElement('statusText', 'hud-line');
        this.playerGoldElement = this.createStatusElement(
            'playerGold',
            'score-line player',
        );
        this.computerGoldElement = this.createStatusElement(
            'computerGold',
            'score-line computer',
        );
        this.seedField = this.createSeedField();
        this.seedInput = this.createSeedInput();
        this.restartButton = this.createRestartButton();
        this.restartCallback = null;
        this.setupSeedInputHandlers();
        this.initializeUI();
    }

    private ensureAppShell(): void {
        const existingApp = document.getElementById('app');
        const existingSidebar = document.getElementById('sidebar');
        const existingGameArea = document.getElementById('gameArea');

        if (existingApp && existingSidebar && existingGameArea) return;

        const app =
            (existingApp as HTMLDivElement | null) ||
            document.createElement('div');
        app.id = 'app';

        const sidebar =
            (existingSidebar as HTMLElement | null) ||
            document.createElement('aside');
        sidebar.id = 'sidebar';

        const gameArea =
            (existingGameArea as HTMLElement | null) ||
            document.createElement('main');
        gameArea.id = 'gameArea';

        if (!existingSidebar) {
            app.appendChild(sidebar);
        }
        if (!existingGameArea) {
            app.appendChild(gameArea);
        }

        if (!existingApp) {
            document.body.appendChild(app);
        }
    }

    /**
     * Creates the main overlay element (used for game-over modal).
     */
    private createOverlay(): HTMLDivElement {
        const existing = document.getElementById('gameOverlay');
        const overlay =
            (existing as HTMLDivElement | null) ||
            document.createElement('div');
        overlay.id = 'gameOverlay';
        if (!existing) {
            const gameArea = document.getElementById('gameArea');
            (gameArea || document.body).appendChild(overlay);
        }
        return overlay;
    }

    private createModal(): HTMLDivElement {
        const existing = document.getElementById('gameOverModal');
        const modal =
            (existing as HTMLDivElement | null) ||
            document.createElement('div');
        modal.id = 'gameOverModal';
        modal.className = 'modal';
        if (modal.parentNode !== this.overlay) {
            this.overlay.appendChild(modal);
        }
        return modal;
    }

    /**
     * Creates a HUD container (always visible during play).
     */
    private createHUD(): HTMLDivElement {
        const existing = document.getElementById('gameHUD');
        const hud =
            (existing as HTMLDivElement | null) ||
            document.createElement('div');
        hud.id = 'gameHUD';
        if (!existing) {
            const sidebar = document.getElementById('sidebar');
            (sidebar || document.body).appendChild(hud);
        }
        return hud;
    }

    /**
     * Creates a status element inside the HUD.
     */
    private createStatusElement(id: string, className: string): HTMLDivElement {
        const existing = document.getElementById(id);
        const element =
            (existing as HTMLDivElement | null) ||
            document.createElement('div');
        element.id = id;
        element.className = className;
        if (element.parentNode !== this.hud) {
            this.hud.appendChild(element);
        }
        return element;
    }

    private createSeedField(): HTMLDivElement {
        const existing = document.getElementById(
            'seedField',
        ) as HTMLDivElement | null;
        if (existing) return existing;

        const container = document.createElement('div');
        container.id = 'seedField';
        container.className = 'seed-field';

        const label = document.createElement('label');
        label.htmlFor = 'seedInput';
        label.textContent = 'Seed';

        container.appendChild(label);
        this.hud.appendChild(container);
        return container;
    }

    /**
     * Creates the seed input element.
     */
    private createSeedInput(): HTMLInputElement {
        const existing = document.getElementById(
            'seedInput',
        ) as HTMLInputElement | null;
        if (existing) return existing;

        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'seedInput';
        input.placeholder = 'Enter seed (optional)';

        this.seedField.appendChild(input);

        return input;
    }

    private setupSeedInputHandlers(): void {
        this.seedInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.triggerRestart();
            }
        });
    }

    private triggerRestart(): void {
        if (typeof this.restartCallback !== 'function') return;
        const seed = this.getSeed();
        this.hideOverlay();
        this.restartCallback(seed);
    }

    /**
     * Creates the restart button.
     */
    private createRestartButton(): HTMLButtonElement {
        const existing = document.getElementById('restartButton');
        const button =
            (existing as HTMLButtonElement | null) ||
            document.createElement('button');
        button.id = 'restartButton';
        if (!button.textContent) button.textContent = 'Restart (R)';
        if (button.parentNode !== this.hud) {
            this.hud.appendChild(button);
        }
        return button;
    }

    /**
     * Initializes the UI elements.
     */
    private initializeUI(): void {
        this.hideOverlay();
    }

    /**
     * Shows the game over screen.
     */
    showGameOver(
        message: string,
        playerGold: number,
        computerGold: number,
        suggestedSeed: number | null = null,
    ): void {
        this.statusText.textContent = message;
        this.playerGoldElement.textContent = `Player Gold: ${playerGold}`;
        this.computerGoldElement.textContent = `Computer Gold: ${computerGold}`;

        this.restartButton.textContent = 'Play';

        if (
            typeof suggestedSeed === 'number' &&
            Number.isFinite(suggestedSeed)
        ) {
            this.seedInput.value = String(suggestedSeed);
        }

        this.modal.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = message;

        const subtitle = document.createElement('div');
        subtitle.className = 'modal-subtitle';
        subtitle.textContent =
            'Enter a seed (or use the suggested one) to start the next match.';

        this.modal.appendChild(title);
        this.modal.appendChild(subtitle);
        this.modal.appendChild(this.playerGoldElement);
        this.modal.appendChild(this.computerGoldElement);
        this.modal.appendChild(this.seedField);
        this.modal.appendChild(this.restartButton);

        this.overlay.style.display = 'flex';

        this.seedInput.focus();
        this.seedInput.select();
    }

    /**
     * Hides the overlay.
     */
    hideOverlay(): void {
        this.overlay.style.display = 'none';
        if (this.playerGoldElement.parentNode !== this.hud) {
            this.hud.appendChild(this.playerGoldElement);
        }
        if (this.computerGoldElement.parentNode !== this.hud) {
            this.hud.appendChild(this.computerGoldElement);
        }
        if (this.seedField.parentNode !== this.hud) {
            this.hud.appendChild(this.seedField);
        }
        if (this.restartButton.parentNode !== this.hud) {
            this.hud.appendChild(this.restartButton);
        }

        if (this.restartButton.textContent !== 'Restart (R)') {
            this.restartButton.textContent = 'Restart (R)';
        }
    }

    /**
     * Gets the current seed value from the input.
     */
    getSeed(): number | null {
        const raw = (this.seedInput.value ?? '').toString().trim();
        if (!raw) return null;
        const parsed = Number.parseInt(raw, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    /**
     * Sets the seed input to the provided seed value.
     */
    setSeed(seed: number | null): void {
        if (typeof seed === 'number' && Number.isFinite(seed)) {
            this.seedInput.value = String(seed);
            return;
        }
        this.seedInput.value = '';
    }

    /**
     * Clears the seed input.
     */
    clearSeed(): void {
        this.seedInput.value = '';
    }

    /**
     * Sets up the restart callback.
     */
    onRestart(callback: (seed: number | null) => void): void {
        this.restartCallback = callback;
        this.restartButton.onclick = () => this.triggerRestart();
    }

    /**
     * Sets up keyboard shortcuts.
     */
    setupKeyboardShortcuts(
        restartCallback: (seed: number | null) => void,
    ): void {
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'r') {
                const seed = this.getSeed();
                this.hideOverlay();
                restartCallback(seed);
            }
        });
    }
}
