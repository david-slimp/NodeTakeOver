/**
 * @jest-environment jsdom
 */

// Import Jest globals
import { jest } from '@jest/globals';
import { cfg } from '../src/config';
import { Game } from '../src/game';

// Simple canvas mock
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

// Mock the canvas
const originalCreateElement = document.createElement;
document.createElement = jest.fn(tagName => {
  const element = originalCreateElement.call(document, tagName);
  
  if (tagName.toLowerCase() === 'canvas') {
    Object.assign(element, {
      getContext: () => new MockContext(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      style: {},
      width: 800,
      height: 600,
      getBoundingClientRect: () => ({ left: 0, top: 0 })
    });
  }
  
  return element;
});

// Mock getElementById to return our canvas, but defer all other lookups to the real DOM.
const originalGetElementById = document.getElementById.bind(document);
document.getElementById = jest.fn(id => {
  if (id === 'gameCanvas') {
    const existing = originalGetElementById('gameCanvas');
    if (existing) return existing;
    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    document.body.appendChild(canvas);
    return canvas;
  }
  return originalGetElementById(id);
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
    PLAYER_COLOR: '#9c27b0',
    COMPUTER_COLOR: '#f44336',
    UNCONTROLLED_COLOR: '#9e9e9e',
    WALL_COLOR: '#000000',
    WALL_WIDTH: 2,
    COMPUTER_DELAY_NEW_BASE: 2000
  },
  rngInstance: {
    random: () => 0.5
  },
  seededRandomGenerator: () => () => 0.5
}));

describe('Game - Fixed Tests', () => {
  let game;
  
  beforeEach(() => {
    // Mock console methods
    global.console.log = jest.fn();
    global.console.error = jest.fn();
    
    // Fresh DOM for each test
    document.body.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    document.body.appendChild(canvas);

    // Initialize game with fixed seed
    game = new Game('gameCanvas', 12345);
  });

  afterEach(() => {
    if (game) {
      game.destroy();
    }
    jest.clearAllMocks();
  });

  describe('displayGameOver', () => {
    test('should update UI elements with game over message and scores', () => {
      // Set test values
      game.playerGold = 75;
      game.computerGold = 25;
      
      // Call the method
      game.displayGameOver('Test Game Over');
      
      // Verify game state
      expect(game.gameActive).toBe(false);
      expect(game.attackAnimations).toEqual([]);
      
      // Verify UI updates
      expect(document.getElementById('statusText').textContent).toBe('Test Game Over');
      expect(document.getElementById('playerGold').textContent).toBe('Player Gold: 75');
      expect(document.getElementById('computerGold').textContent).toBe('Computer Gold: 25');
      expect(document.getElementById('restartButton').style.display).toBe('inline-block');
    });
  });
});
