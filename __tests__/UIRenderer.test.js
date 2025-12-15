/**
 * @jest-environment jsdom
 */

import { UIRenderer } from '../src/UIRenderer';

describe('UIRenderer', () => {
    let uiRenderer;

    beforeEach(() => {
        // Create a clean DOM for each test
        document.body.innerHTML = '';
        uiRenderer = new UIRenderer();
    });

    afterEach(() => {
        // Clean up any event listeners
        document.body.innerHTML = '';
    });

    test('should create all required DOM elements', () => {
        // Check that the overlay was created
        const overlay = document.getElementById('gameOverlay');
        expect(overlay).not.toBeNull();
        
        // Check that all required elements exist
        expect(document.getElementById('statusText')).not.toBeNull();
        expect(document.getElementById('playerGold')).not.toBeNull();
        expect(document.getElementById('computerGold')).not.toBeNull();
        expect(document.getElementById('restartButton')).not.toBeNull();
        expect(document.getElementById('seedInput')).not.toBeNull();
    });

    test('should show game over screen with correct message and scores', () => {
        const message = 'Test Game Over';
        const playerGold = 100;
        const computerGold = 200;
        
        uiRenderer.showGameOver(message, playerGold, computerGold);
        
        const overlay = document.getElementById('gameOverlay');
        const statusText = document.getElementById('statusText');
        const playerGoldElement = document.getElementById('playerGold');
        const computerGoldElement = document.getElementById('computerGold');
        
        expect(overlay.style.display).toBe('flex');
        expect(statusText.textContent).toBe(message);
        expect(playerGoldElement.textContent).toBe(`Player Gold: ${playerGold}`);
        expect(computerGoldElement.textContent).toBe(`Computer Gold: ${computerGold}`);
    });

    test('should hide overlay when hideOverlay is called', () => {
        // First show the overlay
        uiRenderer.showGameOver('Test', 0, 0);
        
        // Then hide it
        uiRenderer.hideOverlay();
        
        const overlay = document.getElementById('gameOverlay');
        expect(overlay.style.display).toBe('none');
    });

    test('should get seed from input', () => {
        const input = document.getElementById('seedInput');
        input.value = '123';
        
        const seed = uiRenderer.getSeed();
        expect(seed).toBe(123);
    });

    test('should return null for empty seed', () => {
        const input = document.getElementById('seedInput');
        input.value = '   ';
        
        const seed = uiRenderer.getSeed();
        expect(seed).toBeNull();
    });

    test('should clear seed input', () => {
        const input = document.getElementById('seedInput');
        input.value = 'test-seed';
        
        uiRenderer.clearSeed();
        expect(input.value).toBe('');
    });

    test('should call restart callback with seed when restart button is clicked', () => {
        const mockCallback = jest.fn();
        const testSeed = '123';
        
        // Set up the callback
        uiRenderer.onRestart(mockCallback);
        
        // Set a seed value
        const input = document.getElementById('seedInput');
        input.value = testSeed;
        
        // Click the restart button
        const button = document.getElementById('restartButton');
        button.click();
        
        // Check that the callback was called with the seed
        expect(mockCallback).toHaveBeenCalledWith(123);
        
        // Check that the overlay was hidden
        const overlay = document.getElementById('gameOverlay');
        expect(overlay.style.display).toBe('none');
        
        // Check that the seed was cleared
        expect(input.value).toBe('');
    });

    test('should call restart callback with null when restarting with empty seed', () => {
        const mockCallback = jest.fn();
        
        // Set up the callback
        uiRenderer.onRestart(mockCallback);
        
        // Make sure the seed input is empty
        const input = document.getElementById('seedInput');
        input.value = '';
        
        // Click the restart button
        const button = document.getElementById('restartButton');
        button.click();
        
        // Check that the callback was called with null
        expect(mockCallback).toHaveBeenCalledWith(null);
    });

    test('should handle keyboard shortcut for restart', () => {
        const mockCallback = jest.fn();
        const testSeed = '456';
        
        // Set up the keyboard shortcuts
        uiRenderer.setupKeyboardShortcuts(mockCallback);
        
        // Set a seed value
        const input = document.getElementById('seedInput');
        input.value = testSeed;
        
        // Simulate pressing 'r' key
        const event = new KeyboardEvent('keydown', { key: 'r' });
        document.dispatchEvent(event);
        
        // Check that the callback was called with the seed
        expect(mockCallback).toHaveBeenCalledWith(456);
        
        // Check that the overlay was hidden
        const overlay = document.getElementById('gameOverlay');
        expect(overlay.style.display).toBe('none');
        
        // Check that the seed was cleared
        expect(input.value).toBe('');
    });
});
