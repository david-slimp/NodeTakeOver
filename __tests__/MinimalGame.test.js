/**
 * @jest-environment jsdom
 */

// Import Jest globals
import { jest } from '@jest/globals';
import { cfg } from '../src/config';
import { Game } from '../src/game';

// Simple canvas mock based on Game.fixed.test.js
class MockContext {
    constructor() {
        this.calls = [];
        this.fillStyle = '';
        this.strokeStyle = '';
        this.lineWidth = 0;
        
        // Mock common methods
        ['fillRect', 'clearRect', 'beginPath', 'arc', 'fill', 'stroke', 'moveTo', 'lineTo', 'closePath']
            .forEach(method => {
                this[method] = jest.fn();
            });
    }
}

// Mock the canvas and document
const mockCanvas = {
    tagName: 'CANVAS',
    getContext: () => new MockContext(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    style: {},
    width: 800,
    height: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0 })
};

// Mock document methods
const originalCreateElement = document.createElement;
document.createElement = jest.fn(tagName => {
    if (tagName.toLowerCase() === 'canvas') {
        const canvas = originalCreateElement.call(document, 'canvas');
        return Object.assign(canvas, mockCanvas);
    }
    return originalCreateElement.call(document, tagName);
});

document.getElementById = jest.fn(id => {
    if (id === 'gameCanvas') {
        return { ...mockCanvas };
    }
    return null;
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => {
    return setTimeout(cb, 0);
});

global.cancelAnimationFrame = jest.fn(id => {
    clearTimeout(id);
});

// Mock the config module
jest.mock('../src/config', () => ({
    cfg: {
        width: 800,
        height: 600,
        nodeRadius: 20,
        MAX_UNITS: 50,
        UNCONTROLLED_MAX_UNITS: 10,
        PLAYER_UNIT_GENERATION_SPEED: 0.1,
        COMPUTER_UNIT_GENERATION_SPEED: 0.05,
        UNCONTROLLED_UNIT_GENERATION_SPEED: 0.02,
        VERBOSE: 0
    },
    rngInstance: {
        random: () => 0.5
    },
    seededRandomGenerator: () => () => 0.5
}));

describe('Minimal Game Test', () => {
    let game;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Create a fresh mock canvas for each test
        document.getElementById.mockImplementation(id => {
            if (id === 'gameCanvas') {
                return { ...mockCanvas };
            }
            return null;
        });
    });

    afterEach(() => {
        // Clean up the game instance if it was created
        if (game && typeof game.destroy === 'function') {
            game.destroy();
        }
    });

    test('should create and destroy game instance', () => {
        // Spy on console.error to catch any errors
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        // Create the game instance
        expect(() => {
            game = new Game('gameCanvas', 12345);
        }).not.toThrow();
        
        // Verify the game instance was created correctly
        expect(game).toBeDefined();
        expect(game.seed).toBe(12345);
        
        // Verify canvas was found and initialized
        expect(document.getElementById).toHaveBeenCalledWith('gameCanvas');
        
        // Check for any console errors
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
        
        // Test destroy method
        expect(() => game.destroy()).not.toThrow();
    });
});
