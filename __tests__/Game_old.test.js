// Mock canvas
class CanvasRenderingContext2D {
  constructor() {
    this._calls = [];
    // Mock common methods
    ['fillRect', 'clearRect', 'getImageData', 'putImageData', 'createImageData', 
     'setTransform', 'drawImage', 'save', 'restore', 'translate', 'scale', 
     'rotate', 'arc', 'arcTo', 'beginPath', 'bezierCurveTo', 'clip', 'closePath',
     'createLinearGradient', 'createRadialGradient', 'drawFocusIfNeeded',
     'ellipse', 'fill', 'fillText', 'lineTo', 'moveTo', 'quadraticCurveTo',
     'rect', 'setLineDash', 'stroke', 'strokeText'].forEach(prop => {
      this[prop] = jest.fn();
    });
  }
}

// Mock the canvas
HTMLCanvasElement.prototype.getContext = jest.fn(() => {
  return new CanvasRenderingContext2D();
});

import { Game } from '../src/game';

describe('Game', () => {
  let game;
  
  beforeEach(() => {
    // Mock canvas
    document.body.innerHTML = '<canvas id="gameCanvas" width="800" height="600"></canvas>';
    
    // Mock console.log to prevent test output clutter
    global.console.log = jest.fn();
    global.console.error = jest.fn();
    
    // Mock config values that might be used during initialization
    jest.mock('../src/config', () => ({
      cfg: {
        VERBOSE: 0,
        WALL_COLOR: '#000000',
        WALL_WIDTH: 2,
        width: 800,
        height: 600,
        nodeRadius: 20,
        wallMaxLength: 100,
        TOTAL_NODES: 10
      },
      rngInstance: {
        random: jest.fn().mockReturnValue(0.5)
      },
      seededRandomGenerator: jest.fn().mockImplementation(() => ({
        random: () => 0.5
      }))
    }));
    
    // Initialize game with fixed seed for predictable tests
    game = new Game('gameCanvas', 12345);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('should initialize with provided seed', () => {
    expect(game.seed).toBe(12345);
  });

  test('should create canvas context', () => {
    expect(game.canvas).toBeDefined();
    expect(game.ctx).toBeDefined();
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
  });

  // Add more tests as we implement more functionality
});
