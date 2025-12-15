/**
 * @jest-environment jsdom
 */

import { Game } from '../src/game';

describe('Game - DOM Tests', () => {
  let game;
  let mockCanvas;
  let mockCtx;
  
  // Helper function to create a DOM element with innerText support
  const createElement = (tag, id) => {
    const el = document.createElement(tag);
    el.id = id;
    // Ensure innerText is available (JSDOM doesn't always have it by default)
    if (!('innerText' in el)) {
      Object.defineProperty(el, 'innerText', {
        get() { return this.textContent; },
        set(value) { this.textContent = value; },
        configurable: true
      });
    }
    return el;
  };
  
  // Set up JSDOM environment before each test
  beforeEach(() => {
    // Clear document body
    document.body.innerHTML = '';
    
    // Create required DOM elements
    const statusText = createElement('div', 'statusText');
    const playerGold = createElement('div', 'playerGold');
    const computerGold = createElement('div', 'computerGold');
    const restartButton = createElement('button', 'restartButton');
    restartButton.style.display = 'none';
    
    // Create and configure the canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.id = 'gameCanvas';
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    
    // Create a mock 2D context
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn()
    };
    
    // Mock getContext to return our mock context
    mockCanvas.getContext = jest.fn(type => type === '2d' ? mockCtx : null);
    
    // Mock getBoundingClientRect
    mockCanvas.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600
    }));
    
    // Mock event listeners
    mockCanvas.addEventListener = jest.fn();
    mockCanvas.removeEventListener = jest.fn();
    
    // Add all elements to the document body
    document.body.appendChild(mockCanvas);
    document.body.appendChild(statusText);
    document.body.appendChild(playerGold);
    document.body.appendChild(computerGold);
    document.body.appendChild(restartButton);
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => {
      const id = setTimeout(() => cb(performance.now()), 0);
      return id;
    });
    
    global.cancelAnimationFrame = jest.fn(id => {
      clearTimeout(id);
    });
    
    // Mock performance.now()
    global.performance = {
      now: jest.fn(() => Date.now())
    };
    
    // Create game instance
    game = new Game('gameCanvas');
  });
  
  // Clean up after each test
  afterEach(() => {
    if (game) {
      game.destroy();
      game = null;
    }
    
    // Clean up any pending timers
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test('should update UI on game over', () => {
    // Set up test data
    const message = 'Game Over!';
    game.playerGold = 100;
    game.computerGold = 200;
    
    // Mock UIRenderer.showGameOver
    const mockShowGameOver = jest.spyOn(game.uiRenderer, 'showGameOver');
    
    // Call the method
    game.displayGameOver(message);
    
    // Verify UIRenderer.showGameOver was called with correct arguments
    expect(mockShowGameOver).toHaveBeenCalledWith(
      message,
      game.playerGold,
      game.computerGold,
      expect.any(Number)
    );
    
    // Verify game state
    expect(game.gameActive).toBe(false);
    expect(game.attackAnimations).toEqual([]);
    
    // Clean up mock
    mockShowGameOver.mockRestore();
  });
});
