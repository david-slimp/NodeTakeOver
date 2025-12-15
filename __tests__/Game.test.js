// Import Jest globals
import { jest } from '@jest/globals';
import { cfg } from '../src/config';

// Keep Game.initGame fast/deterministic in unit tests.
// These tests largely stub/mutate game state directly and don't need full wall generation.
cfg.WALL_COUNT = 0;
cfg.TOTAL_NODES = 0;

// Simple canvas mock for non-DOM tests
const createMockCanvas = () => ({
  getContext: () => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  style: {},
  width: 800,
  height: 600,
  getBoundingClientRect: () => ({ left: 0, top: 0 })
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => {
  return setTimeout(cb, 0);
});

global.cancelAnimationFrame = jest.fn(id => {
  clearTimeout(id);
});

// Import the Game class
import { Game } from '../src/game';

// Mock console to prevent test output clutter
global.console.log = jest.fn();
global.console.error = jest.fn();

describe('Game', () => {
  console.log('Inside describe block');
  let game;
  let mockCanvas;
  let mockCtx;
  
  beforeEach(() => {
    // Create a mock canvas and context
    mockCanvas = createMockCanvas();
    mockCtx = mockCanvas.getContext();
    
    // Create a new game instance for each test with skipUIRenderer: true
    game = new Game(mockCanvas, 12345, false, { skipUIRenderer: true });
    
    // Mock the node renderer
    game.nodeRenderer = {
      drawNode: jest.fn(),
      drawNodeChain: jest.fn()
    };
    
    // Initialize test data
    game.attackAnimations = [];
    game.activeTimeouts = [];
    game.nodes = [];
    game.walls = [];
    game.playerGold = 0;
    game.computerGold = 0;
    game.isPaused = false;
    game.gameActive = true;
  });
  
  afterEach(() => {
    if (game) {
      game.destroy();
    }
    jest.clearAllMocks();
  });

  // Basic Functionality Tests
  describe('Basic Functionality', () => {
    console.log('Inside Basic Functionality describe');
    
    test('should initialize with provided seed', async () => {
      console.log('Running test: should initialize with provided seed');
      let testGame;
      
      // Set a timeout for the test
      const testPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out after 5 seconds'));
        }, 5000);

        try {
          console.log('About to create Game instance');
          testGame = new Game(mockCanvas, 12345, false, { skipUIRenderer: true });
          console.log('Game instance created successfully');
          clearTimeout(timeout);
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });

      try {
        await testPromise;
        console.log('Game instance properties:', Object.keys(testGame));
        console.log('Checking seed expectation');
        expect(testGame.seed).toBe(12345);
        console.log('Expectation passed');
        console.log('About to call destroy()');
        testGame.destroy();
        console.log('Test cleanup complete');
      } catch (error) {
        console.error('Error in test:', error);
        if (testGame && typeof testGame.destroy === 'function') {
          console.log('Attempting to clean up testGame');
          testGame.destroy();
        }
        throw error;
      }
    });

    test('should initialize game with default values', () => {
      expect(game.seed).toBe(12345);
    });

    test('should create canvas context', () => {
      expect(game.canvas).toBeDefined();
      expect(game.ctx).toBeDefined();
    });
    
    test('should have game state variables', () => {
      expect(game.isPaused).toBeDefined();
      expect(game.gameActive).toBeDefined();
      expect(game.nodes).toBeDefined();
      expect(game.walls).toBeDefined();
    });
  });

  // Core Game Methods
  describe('Core Game Methods', () => {
    test('should toggle pause state', () => {
      const initialPauseState = game.isPaused;
      game.togglePause();
      expect(game.isPaused).not.toBe(initialPauseState);
    });

    test('should clean up resources on destroy', () => {
      // Mock some timeouts
      game.activeTimeouts = [setTimeout(() => {}, 100)];
      
      // Spy on clearTimeout
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      // Trigger destroy
      game.destroy();
      
      // Verify cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(game.gameActive).toBe(false);
    });
  });

  // Utility Methods
  describe('Utility Methods', () => {
    test('should calculate distance between points', () => {
      const node1 = { x: 0, y: 0 };
      const node2 = { x: 3, y: 4 }; // 3-4-5 triangle
      
      const distance = game.distanceBetweenNodes(node1, node2);
      expect(distance).toBe(5);
    });
    
    test('should detect line intersections', () => {
      // Lines that intersect
      const intersect = game.linesIntersect(0, 0, 10, 10, 0, 10, 10, 0);
      expect(intersect).toBe(true);
      
      // Lines that don't intersect
      const noIntersect = game.linesIntersect(0, 0, 10, 0, 0, 10, 10, 10);
      expect(noIntersect).toBe(false);
    });
  });

  // Initialization Methods
  describe('Initialization Methods', () => {
    test('should initialize controlled nodes', () => {
      const testGame = new Game(null, 12345);
      
      // Mock initializeRandomNode to add nodes to the nodes array
      const originalInitializeRandomNode = testGame.initializeRandomNode;
      testGame.initializeRandomNode = (color, units, avoidNode) => {
        const node = { 
          x: color === cfg.PLAYER_COLOR ? 0 : 100, 
          y: color === cfg.PLAYER_COLOR ? 0 : 100, 
          owner: color === cfg.PLAYER_COLOR ? 'player' : 'computer',
          units,
          color
        };
        testGame.nodes.push(node);
        return node;
      };
      
      testGame.initializeControlledNodes();
      
      // Should have at least player and computer nodes
      const playerNodes = testGame.nodes.filter(n => n.owner === 'player');
      const computerNodes = testGame.nodes.filter(n => n.owner === 'computer');
      
      expect(playerNodes.length).toBeGreaterThan(0);
      expect(computerNodes.length).toBeGreaterThan(0);
      
      // Restore original method
      testGame.initializeRandomNode = originalInitializeRandomNode;
      testGame.destroy();
    });
    
    test('should initialize random node', () => {
      const testGame = new Game(null, 12345);
      
      // Create some test nodes that will be used by randomNode
      const testNodes = [
        { x: 100, y: 100, units: 5, color: '#CCCCCC', owner: null },
        { x: 200, y: 200, units: 5, color: '#CCCCCC', owner: null },
        { x: 300, y: 300, units: 5, color: '#CCCCCC', owner: null }
      ];
      
      // Add test nodes to the game
      testGame.nodes = [...testNodes];
      
      // Mock randomNode to return the first test node
      const originalRandomNode = testGame.randomNode;
      testGame.randomNode = jest.fn().mockReturnValue(testNodes[0]);
      
      const color = cfg.PLAYER_COLOR;
      const units = 10;
      
      // Call initializeRandomNode
      const node = testGame.initializeRandomNode(color, units);
      
      // Verify node properties were updated
      expect(node).toBeDefined();
      expect(node).toBe(testNodes[0]); // Should be the same node object
      expect(node.units).toBe(units);
      expect(node.color).toBe(color);
      expect(node.owner).toBe('player');
      
      // Verify randomNode was called with the nodes array
      expect(testGame.randomNode).toHaveBeenCalledWith(testNodes);
      
      // Test with avoidNode
      const avoidNode = { x: 150, y: 150 };
      
      // Mock distance check to fail first, then pass
      testGame.distanceBetweenNodes = jest.fn()
        .mockReturnValueOnce(50) // First distance check fails (too close)
        .mockReturnValue(150);   // Subsequent checks pass
      
      // Mock randomNode to return different nodes on subsequent calls
      let callCount = 0;
      testGame.randomNode = jest.fn().mockImplementation(() => {
        return testNodes[callCount++ % testNodes.length];
      });
      
      const node2 = testGame.initializeRandomNode(color, units, avoidNode);
      expect(node2).toBeDefined();
      expect(node2).not.toBe(testNodes[0]); // Should have skipped the first node
      
      // Clean up
      testGame.randomNode = originalRandomNode;
    });
    
    test('should initialize uncontrolled nodes', () => {
      const testGame = new Game(null, 12345);
      
      // Create test nodes that will be modified by initializeUncontrolledNodes
      const playerNode = { 
        x: 100, 
        y: 100,
        owner: 'player',
        color: cfg.PLAYER_COLOR,
        units: 10,
        maxUnits: 20,
        generationSpeed: 1.0
      };
      
      const computerNode = { 
        x: 700, 
        y: 500,
        owner: 'computer',
        color: cfg.COMPUTER_COLOR,
        units: 10,
        maxUnits: 20,
        generationSpeed: 0.8
      };
      
      const neutralNode1 = { 
        x: 200, 
        y: 200,
        owner: null,
        color: cfg.UNCONTROLLED_COLOR,
        units: 5,
        maxUnits: 10,
        generationSpeed: 0.5
      };
      
      const neutralNode2 = { 
        x: 300, 
        y: 300,
        owner: null,
        color: cfg.UNCONTROLLED_COLOR,
        units: 5,
        maxUnits: 10,
        generationSpeed: 0.5
      };
      
      // Set up the nodes array with all nodes
      testGame.nodes = [playerNode, computerNode, neutralNode1, neutralNode2];
      
      // Mock config values
      const originalUncontrolledStartUnits = cfg.UNCONTROLLED_START_UNITS;
      const originalUncontrolledColor = cfg.UNCONTROLLED_COLOR;
      const originalMaxUnits = cfg.MAX_UNITS;
      const originalUncontrolledMaxUnits = cfg.UNCONTROLLED_MAX_UNITS;
      const originalUncontrolledSpeed = cfg.UNCONTROLLED_UNIT_GENERATION_SPEED;
      const originalPlayerSpeed = cfg.PLAYER_UNIT_GENERATION_SPEED;
      const originalComputerSpeed = cfg.COMPUTER_UNIT_GENERATION_SPEED;
      
      cfg.UNCONTROLLED_START_UNITS = 3;
      cfg.UNCONTROLLED_COLOR = '#888888';
      cfg.MAX_UNITS = 20;
      cfg.UNCONTROLLED_MAX_UNITS = 0.5; // 50% of MAX_UNITS
      cfg.UNCONTROLLED_UNIT_GENERATION_SPEED = 0.3;
      cfg.PLAYER_UNIT_GENERATION_SPEED = 1.0;
      cfg.COMPUTER_UNIT_GENERATION_SPEED = 0.8;
      
      // Call the method
      testGame.initializeUncontrolledNodes(playerNode, computerNode);
      
      // Verify player node was updated correctly
      expect(playerNode.maxUnits).toBe(cfg.MAX_UNITS);
      expect(playerNode.generationSpeed).toBe(cfg.PLAYER_UNIT_GENERATION_SPEED);
      
      // Verify computer node was updated correctly
      expect(computerNode.maxUnits).toBe(cfg.MAX_UNITS);
      expect(computerNode.generationSpeed).toBe(cfg.COMPUTER_UNIT_GENERATION_SPEED);
      
      // Verify neutral nodes were updated correctly
      [neutralNode1, neutralNode2].forEach(node => {
        expect(node.units).toBe(cfg.UNCONTROLLED_START_UNITS);
        expect(node.color).toBe(cfg.UNCONTROLLED_COLOR);
        expect(node.owner).toBeNull();
        expect(node.maxUnits).toBe(Math.floor(cfg.MAX_UNITS * cfg.UNCONTROLLED_MAX_UNITS));
        expect(node.generationSpeed).toBe(cfg.UNCONTROLLED_UNIT_GENERATION_SPEED);
      });
      
      // Clean up
      cfg.UNCONTROLLED_START_UNITS = originalUncontrolledStartUnits;
      cfg.UNCONTROLLED_COLOR = originalUncontrolledColor;
      cfg.MAX_UNITS = originalMaxUnits;
      cfg.UNCONTROLLED_MAX_UNITS = originalUncontrolledMaxUnits;
      cfg.UNCONTROLLED_UNIT_GENERATION_SPEED = originalUncontrolledSpeed;
      cfg.PLAYER_UNIT_GENERATION_SPEED = originalPlayerSpeed;
      cfg.COMPUTER_UNIT_GENERATION_SPEED = originalComputerSpeed;
      
      testGame.destroy();
    });
    
    test('should get random node from array', () => {
      const testGame = new Game(null, 12345);
      const nodes = [
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ];
      
      // Test with mock RNG
      const originalRandom = testGame.rng;
      testGame.rng = jest.fn().mockReturnValue(0.5); // Should pick index 1 (0.5 * 3 = 1.5 -> index 1)
      
      const randomNode = testGame.randomNode(nodes);
      expect(randomNode).toBe(nodes[1]);
      
      // Restore original RNG
      testGame.rng = originalRandom;
      testGame.destroy();
    });
    test('should initialize board with specified number of nodes', () => {
      const testGame = new Game(null, 12345);
      const nodes = testGame.initializeBoard(5);
      expect(nodes).toHaveLength(5);
      testGame.destroy();
    });

    test('should validate node positions correctly', () => {
      const testGame = new Game(null, 12345);
      const nodes = [
        { x: 100, y: 100, radius: 20 }
      ];
      
      // Node that's too close (less than 2 * radius apart)
      const closeNode = { x: 100, y: 100, radius: 20 };
      const isValidClose = testGame.isNodePositionValid(closeNode, nodes);
      expect(isValidClose).toBe(false);
      
      // Node that's far enough (more than 2 * radius apart)
      const farNode = { x: 200, y: 200, radius: 20 };
      const isValidFar = testGame.isNodePositionValid(farNode, nodes);
      expect(isValidFar).toBe(true);
      
      testGame.destroy();
    });

    test('should detect line-circle intersections', () => {
      const testGame = new Game(null, 12345);
      // Line from (0,0) to (10,0), circle at (5,0) with radius 1
      const intersects = testGame.lineIntersectsCircle(0, 0, 10, 0, 5, 0, 1);
      expect(intersects).toBe(true);
      
      // Line from (0,0) to (10,0), circle at (5,5) with radius 1 (should not intersect)
      const noIntersect = testGame.lineIntersectsCircle(0, 0, 10, 0, 5, 5, 1);
      expect(noIntersect).toBe(false);
      
      testGame.destroy();
    });
  });

  // Game Loop and Updates
  describe('Game Loop and Updates', () => {
    test('should update game state with delta time', () => {
      const testGame = new Game(null, 12345);
      
      // Mock node with units
      const testNode = { 
        owner: 'player',
        units: 1,
        maxUnits: 100,
        generationSpeed: 0.1, // 0.1 units per second
        lastUnitUpdate: 0
      };
      
      testGame.nodes = [testNode];
      
      // Call updateGameState with 1000ms (1 second)
      testGame.updateGameState(1.0); // 1.0 second
      
      // Units should have increased by generationSpeed * generationInterval * (deltaTime / generationInterval)
      // generationInterval = 1/30 (30 updates per second)
      // For 1 second, we'd have 30 updates of generationSpeed * (1/30)
      const expectedUnits = 1 + (0.1 * (1/30) * 30);
      
      // Check if units increased (allowing for floating point imprecision)
      expect(testNode.units).toBeGreaterThan(1);
      expect(testNode.units).toBeCloseTo(expectedUnits);
      
      testGame.destroy();
    });
    
    test('should calculate travel time between nodes', () => {
      const testGame = new Game(null, 12345);
      
      // Create two nodes with positions
      const node1 = { x: 0, y: 0 };
      const node2 = { x: 100, y: 0 };
      
      // Mock cfg.nodeRadius for the test
      const originalNodeRadius = cfg.nodeRadius;
      cfg.nodeRadius = 10; // Set a fixed radius for testing
      
      // Calculate expected distance: sqrt((100-0)² + (0-0)²) - 2*10 = 100 - 20 = 80
      const expectedDistance = 80;
      const unitSpeed = 2; // units per second
      
      // Expected time: (distance / speed) * 100
      const expectedTime = (expectedDistance / unitSpeed) * 100;
      
      const travelTime = testGame.calculateTravelTime(node1, node2, unitSpeed);
      
      // Check if the travel time is calculated correctly
      expect(travelTime).toBeCloseTo(expectedTime);
      
      // Restore original node radius
      cfg.nodeRadius = originalNodeRadius;
      testGame.destroy();
    });
    
    test('should find target node for computer', () => {
      const testGame = new Game(null, 12345);
      
      // Set up test nodes
      const sourceNode = { 
        x: 100, 
        y: 100, 
        owner: 'computer',
        units: 10
      };
      
      const playerNode = { 
        x: 200, 
        y: 100, 
        owner: 'player',
        units: 5
      };
      
      const neutralNode = { 
        x: 100, 
        y: 200, 
        owner: null,
        units: 3
      };
      
      testGame.nodes = [sourceNode, playerNode, neutralNode];
      
      // Should prefer attacking player nodes
      const target = testGame.findTargetNode(sourceNode);
      expect(target).toBe(playerNode);
      
      testGame.destroy();
    });
  });

  describe('Attack Animations', () => {
    test('should draw attack animations', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Create a test animation
      const mockAnimation = {
        fromNode: { x: 0, y: 0 },
        toNode: { x: 100, y: 100 },
        progress: 0.5,
        completed: false,
        units: 5,
        owner: 'player'
      };
      testGame.attackAnimations = [mockAnimation];
      
      // Mock canvas context methods
      const ctx = testGame.ctx;
      ctx.beginPath = jest.fn();
      ctx.arc = jest.fn();
      ctx.fill = jest.fn();
      
      // Call drawAttackAnimations
      testGame.drawAttackAnimations();
      
      // Verify animation was drawn
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      
      testGame.destroy();
    });
  });

  // Game Logic
  describe('Game Logic', () => {
    test('should send units from one node to another', () => {
      const testGame = new Game(null, 12345, false, { skipUIRenderer: true });
      
      // Create test nodes with required properties
      const fromNode = { 
        x: 0, 
        y: 0, 
        owner: 'player', 
        units: 10,
        maxUnits: 10,
        radius: 20,
        color: cfg.PLAYER_COLOR
      };
      
      const toNode = { 
        x: 100, 
        y: 100, 
        owner: 'computer', 
        units: 5,
        maxUnits: 10,
        radius: 20,
        color: cfg.COMPUTER_COLOR
      };
      
      // Mock calculateTravelTime
      const originalCalculateTravelTime = testGame.calculateTravelTime;
      testGame.calculateTravelTime = jest.fn().mockReturnValue(1000);
      
      // Mock performance.now()
      const mockNow = 1000000;
      const originalPerformanceNow = performance.now;
      performance.now = jest.fn().mockReturnValue(mockNow);
      
      // The actual implementation sends 1 unit, not 5
      
      // Call sendUnits
      testGame.sendUnits(fromNode, toNode, 1);
      
      // Verify animation was created with correct properties
      expect(testGame.attackAnimations.length).toBe(1);
      const animation = testGame.attackAnimations[0];
      
      expect(animation.fromNode).toBe(fromNode);
      expect(animation.toNode).toBe(toNode);
      expect(animation.startTime).toBe(mockNow);
      expect(animation.duration).toBe(1000);
      expect(animation.units).toBe(1);
      // The implementation stores color, not owner
      expect(animation.color).toBe(fromNode.color);
      
      // Verify units were deducted from the source node
      expect(fromNode.units).toBe(9); // 10 - 1 = 9
      
      // Clean up
      testGame.calculateTravelTime = originalCalculateTravelTime;
      performance.now = originalPerformanceNow;
      testGame.destroy();
    });
    test('should resolve battles correctly', () => {
      // Mock a node
      const node = { 
        owner: 'computer', 
        units: 2, 
        maxUnits: 100,
        color: '',
        destination: null
      };
      
      // Test attacking node
      game.resolveBattle(node, 'player');
      expect(node.units).toBe(1); // Should reduce units by 1
      
      // Test capturing the node
      game.resolveBattle(node, 'player');
      expect(node.owner).toBe('player');
      expect(node.units).toBe(0);
    });
    
    test('should detect player victory when all nodes are controlled by player', () => {
      // Create a minimal game instance
      const testGame = new Game('gameCanvas', 12345);
      
      // Set up the game state with all nodes controlled by player
      testGame.nodes = [
        { 
          owner: 'player',
          units: 1,
          maxUnits: 100,
          color: '#9c27b0',
          x: 100,
          y: 100,
          radius: 10
        },
        { 
          owner: 'player',
          units: 1,
          maxUnits: 100,
          color: '#9c27b0',
          x: 200,
          y: 200,
          radius: 10
        }
      ];
      
      // Mock the displayGameOver method
      testGame.displayGameOver = jest.fn();
      
      // Call the method
      testGame.checkGameOver();
      
      // Verify displayGameOver was called with the correct message
      expect(testGame.displayGameOver).toHaveBeenCalledWith('Congratulations! You win!');
      
      // Clean up
      testGame.destroy();
    });
    
    test('should detect computer victory when all nodes are controlled by computer', () => {
      // Create a minimal game instance
      const testGame = new Game('gameCanvas', 12345);
      
      // Set up the game state with all nodes controlled by computer
      testGame.nodes = [
        { 
          owner: 'computer',
          units: 1,
          maxUnits: 100,
          color: '#f44336',
          x: 100,
          y: 100,
          radius: 10
        }
      ];
      
      // Mock the displayGameOver method
      testGame.displayGameOver = jest.fn();
      
      // Call the method
      testGame.checkGameOver();
      
      // Verify displayGameOver was called with the correct message
      expect(testGame.displayGameOver).toHaveBeenCalledWith('Computer wins!');
      
      // Clean up
      testGame.destroy();
    });
    
    test('should not end game when both players have nodes', () => {
      // Create a minimal game instance
      const testGame = new Game('gameCanvas', 12345);
      
      // Set up the game state with nodes for both players
      testGame.nodes = [
        { 
          owner: 'player',
          units: 1,
          maxUnits: 100,
          color: '#9c27b0',
          x: 100,
          y: 100,
          radius: 10
        },
        { 
          owner: 'computer',
          units: 1,
          maxUnits: 100,
          color: '#f44336',
          x: 200,
          y: 200,
          radius: 10
        }
      ];
      
      // Mock the displayGameOver method
      testGame.displayGameOver = jest.fn();
      
      // Call the method
      testGame.checkGameOver();
      
      // Verify displayGameOver was not called
      expect(testGame.displayGameOver).not.toHaveBeenCalled();
      
      // Clean up
      testGame.destroy();
    });
  });

  // Core Game Logic Tests
  describe('Core Game Logic', () => {
    test('should have a checkGameOver method', () => {
      const testGame = new Game(null, 12345, false, { skipUIRenderer: true });
      expect(typeof testGame.checkGameOver).toBe('function');
      testGame.destroy();
    });
    
    test('should have a destroy method', () => {
      const testGame = new Game(null, 12345, false, { skipUIRenderer: true });
      expect(typeof testGame.destroy).toBe('function');
      testGame.destroy();
    });
    
    test('should have core game methods', () => {
      const testGame = new Game(null, 12345, false, { skipUIRenderer: true });
      expect(typeof testGame.updateGameState).toBe('function');
      expect(typeof testGame.sendUnits).toBe('function');
      expect(typeof testGame.findTargetNode).toBe('function');
      expect(typeof testGame.isPathBlocked).toBe('function');
      testGame.destroy();
    });
    
    test('should have an initializeBoard method', () => {
      const testGame = new Game(null, 12345, false, { skipUIRenderer: true });
      expect(typeof testGame.initializeBoard).toBe('function');
      testGame.destroy();
    });
  });

  describe('Random Node Methods', () => {
    test('should have a randomNode method', () => {
      const testGame = new Game('gameCanvas', 12345);
      expect(typeof testGame.randomNode).toBe('function');
      testGame.destroy();
    });

    test('should have a distanceBetweenNodes method', () => {
      const testGame = new Game('gameCanvas', 12345);
      expect(typeof testGame.distanceBetweenNodes).toBe('function');
      testGame.destroy();
    });

    test('should have a constructor that initializes properties', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Check that essential properties are initialized
      expect(testGame.canvas).toBeDefined();
      expect(testGame.ctx).toBeDefined();
      expect(testGame.nodes).toBeInstanceOf(Array);
      expect(testGame.walls).toBeInstanceOf(Array);
      expect(testGame.attackAnimations).toBeInstanceOf(Array);
      expect(testGame.activeTimeouts).toBeInstanceOf(Array);
      expect(testGame.seed).toBe(12345);
      expect(testGame.isPaused).toBe(false);
      // gameActive is false by default in the constructor
      expect(testGame.gameActive).toBe(false);
      
      testGame.destroy();
    });

    test('should have a start method that initializes the game', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Mock methods
      const initGameMock = jest.spyOn(testGame, 'initGame').mockImplementation(() => {});
      const startGameLoopMock = jest.spyOn(testGame, 'startGameLoop').mockImplementation(() => {});
      
      // Call start
      testGame.start();
      
      // Verify methods were called
      expect(initGameMock).toHaveBeenCalled();
      expect(startGameLoopMock).toHaveBeenCalled();
      
      // Verify timers were reset
      expect(testGame.lastFrameTime).toBe(0);
      expect(testGame.continuousFlowTimer).toBe(0);
      expect(testGame.unitGenerationTimer).toBe(0);
      
      // Clean up
      initGameMock.mockRestore();
      startGameLoopMock.mockRestore();
      testGame.destroy();
    });

    test('should check game over conditions', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Mock displayGameOver to verify it's called
      const displayGameOverMock = jest.spyOn(testGame, 'displayGameOver').mockImplementation(() => {});
      
      // Set up test nodes
      const playerNode = { owner: 'player' };
      const computerNode = { owner: 'computer' };
      
      // Test when game is not over - should not call displayGameOver
      testGame.nodes = [playerNode, computerNode];
      testGame.checkGameOver();
      expect(displayGameOverMock).not.toHaveBeenCalled();
      
      // Test when player wins - should call displayGameOver with win message
      testGame.nodes = [playerNode, { ...playerNode }];
      testGame.checkGameOver();
      expect(displayGameOverMock).toHaveBeenCalledWith('Congratulations! You win!');
      
      // Test when computer wins - should call displayGameOver with lose message
      displayGameOverMock.mockClear();
      testGame.nodes = [computerNode, { ...computerNode }];
      testGame.checkGameOver();
      expect(displayGameOverMock).toHaveBeenCalledWith('Computer wins!');
      
      // Clean up
      displayGameOverMock.mockRestore();
      testGame.destroy();
    });

    test('should display game over message and update UI', () => {
      const testGame = new Game('gameCanvas', 12345);

      // Set test gold values
      testGame.playerGold = 50;
      testGame.computerGold = 30;
      
      // Verify UI renderer is invoked (Game no longer writes directly into DOM)
      const showGameOverMock = jest
        .spyOn(testGame.uiRenderer, 'showGameOver')
        .mockImplementation(() => {});

      // Test game over
      testGame.displayGameOver('Test Game Over');
      
      // Verify game state was updated
      expect(testGame.gameActive).toBe(false);
      expect(testGame.attackAnimations).toEqual([]);

      expect(showGameOverMock).toHaveBeenCalledWith(
        'Test Game Over',
        50,
        30,
        expect.any(Number),
      );
      
      showGameOverMock.mockRestore();
      testGame.destroy();
    });

    test('should destroy the game and clean up', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Set up test state
      testGame.gameLoopId = 123;
      testGame.activeTimeouts = [setTimeout(() => {}, 1000)];
      
      // Mock methods
      const originalClearTimeout = global.clearTimeout;
      global.clearTimeout = jest.fn();
      
      // Call destroy
      testGame.destroy();
      
      // Verify cleanup
      expect(global.clearTimeout).toHaveBeenCalledWith(123);
      expect(global.clearTimeout).toHaveBeenCalledWith(expect.any(Number));
      expect(testGame.gameActive).toBe(false);
      
      // Restore original method
      global.clearTimeout = originalClearTimeout;
    });

    test('should clear all active timeouts', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Set up test timeouts
      const timeout1 = setTimeout(() => {}, 1000);
      const timeout2 = setTimeout(() => {}, 2000);
      testGame.activeTimeouts = [timeout1, timeout2];
      
      // Mock clearTimeout
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      // Call clearActiveTimeouts
      testGame.clearActiveTimeouts();
      
      // Verify timeouts were cleared
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout1);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout2);
      expect(testGame.activeTimeouts).toHaveLength(0);
      
      // Clean up
      clearTimeoutSpy.mockRestore();
      testGame.destroy();
    });

    test('should set gameboard dimensions', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Mock canvas dimensions
      testGame.canvas.width = 0;
      testGame.canvas.height = 0;
      
      // Call setGameboardDimensions
      testGame.setGameboardDimensions();
      
      // Verify dimensions are set
      expect(testGame.canvas.width).toBeGreaterThan(0);
      expect(testGame.canvas.height).toBeGreaterThan(0);
      
      testGame.destroy();
    });

    test('should initialize the game', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Mock methods
      testGame.initializeBoard = jest.fn().mockReturnValue([]);
      testGame.initializeControlledNodes = jest.fn();
      
      // Call initGame
      testGame.initGame();
      
      // Verify initialization methods were called
      expect(testGame.initializeBoard).toHaveBeenCalled();
      expect(testGame.initializeControlledNodes).toHaveBeenCalled();
      
      testGame.destroy();
    });

    test('should initialize the game board', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Call initializeBoard with a specific number of nodes
      const numNodes = 5;
      const nodes = testGame.initializeBoard(numNodes);
      
      // Verify the correct number of nodes were created
      expect(nodes).toHaveLength(numNodes);
      
      // Verify each node has required properties
      nodes.forEach(node => {
        expect(node).toHaveProperty('x');
        expect(node).toHaveProperty('y');
        expect(node).toHaveProperty('radius');
        expect(node).toHaveProperty('units');
        expect(node).toHaveProperty('owner');
        expect(node).toHaveProperty('color');
      });
      
      testGame.destroy();
    }),

    test('should calculate distance between nodes', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Test with known values (3-4-5 triangle)
      const node1 = { x: 0, y: 0 };
      const node2 = { x: 3, y: 4 };
      
      const distance = testGame.distanceBetweenNodes(node1, node2);
      expect(distance).toBe(5);
      
      testGame.destroy();
    }),

    test('should handle continuous unit flow for player and computer', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Set up test nodes
      const playerNode = { 
        owner: 'player', 
        destination: { owner: 'computer', x: 100, y: 100 }, 
        units: 10, 
        x: 0, 
        y: 0 
      };
      const computerNode = { 
        owner: 'computer', 
        units: 15, 
        x: 200, 
        y: 200,
        destination: null
      };
      const targetNode = { 
        owner: 'player', 
        units: 5, 
        x: 300, 
        y: 300,
        destination: null
      };
      
      testGame.nodes = [playerNode, computerNode, targetNode];
      testGame.gameActive = true;
      
      // Mock dependencies
      testGame.sendUnits = jest.fn();
      testGame.findTargetNode = jest.fn().mockReturnValue(targetNode);
      testGame.isPathBlocked = jest.fn().mockReturnValue(false);
      
      // First test - only player should send units (computer can't act yet)
      testGame.computerCanAct = false;
      testGame.handleContinuousFlow();
      
      // Verify only player sent units
      expect(testGame.sendUnits).toHaveBeenCalledTimes(1);
      expect(testGame.sendUnits).toHaveBeenCalledWith(
        playerNode, 
        playerNode.destination, 
        expect.any(Number)
      );
      
      // Reset mocks
      testGame.sendUnits.mockClear();
      
      // Second test - computer can act and should send units
      testGame.computerCanAct = true;
      testGame.computerLastCaptureTime = Date.now() - (cfg.COMPUTER_DELAY_NEW_BASE + 1000);
      testGame.handleContinuousFlow();
      
      // Verify both player and computer sent units
      expect(testGame.sendUnits).toHaveBeenCalledTimes(2);
      expect(testGame.findTargetNode).toHaveBeenCalledWith(computerNode);
      
      // Verify computer node's destination was set
      expect(computerNode.destination).toBe(targetNode);
      
      testGame.destroy();
    });

    test('should check game over conditions', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Mock displayGameOver to verify it's called
      const displayGameOverMock = jest.spyOn(testGame, 'displayGameOver').mockImplementation(() => {});
      
      // Set up test nodes
      const playerNode = { owner: 'player' };
      const computerNode = { owner: 'computer' };
      
      // Test when game is not over - should not call displayGameOver
      testGame.nodes = [playerNode, computerNode];
      testGame.checkGameOver();
      expect(displayGameOverMock).not.toHaveBeenCalled();
      
      // Test when player wins - should call displayGameOver with win message
      testGame.nodes = [playerNode, { ...playerNode }];
      testGame.checkGameOver();
      expect(displayGameOverMock).toHaveBeenCalledWith('Congratulations! You win!');
      
      // Test when computer wins - should call displayGameOver with lose message
      displayGameOverMock.mockClear();
      testGame.nodes = [computerNode, { ...computerNode }];
      testGame.checkGameOver();
      expect(displayGameOverMock).toHaveBeenCalledWith('Computer wins!');
      
      // Clean up
      displayGameOverMock.mockRestore();
      testGame.destroy();
    });

    test('should display game over message and update UI', () => {
      const testGame = new Game('gameCanvas', 12345);

      // Set test gold values
      testGame.playerGold = 50;
      testGame.computerGold = 30;

      // Verify UI renderer is invoked (Game no longer writes directly into DOM)
      const showGameOverMock = jest
        .spyOn(testGame.uiRenderer, 'showGameOver')
        .mockImplementation(() => {});
      
      // Test game over
      testGame.displayGameOver('Test Game Over');
      
      // Verify game state was updated
      expect(testGame.gameActive).toBe(false);
      expect(testGame.attackAnimations).toEqual([]);

      expect(showGameOverMock).toHaveBeenCalledWith(
        'Test Game Over',
        50,
        30,
        expect.any(Number),
      );

      showGameOverMock.mockRestore();
      
      testGame.destroy();
    });

    test('should destroy the game and clean up', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Set up test state
      testGame.gameLoopId = 123;
      testGame.activeTimeouts = [setTimeout(() => {}, 1000)];
      
            // Mock methods
      const originalClearTimeout = global.clearTimeout;
      global.clearTimeout = jest.fn();
      
      // Call destroy
      testGame.destroy();
      
      // Verify cleanup
      expect(global.clearTimeout).toHaveBeenCalledWith(123);
      expect(global.clearTimeout).toHaveBeenCalledWith(expect.any(Number));
      expect(testGame.gameActive).toBe(false);
      
      // Restore original method
      global.clearTimeout = originalClearTimeout;
    });

    test('should clear all active timeouts', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Set up test timeouts
      const timeout1 = setTimeout(() => {}, 1000);
      const timeout2 = setTimeout(() => {}, 2000);
      testGame.activeTimeouts = [timeout1, timeout2];
      
      // Mock clearTimeout
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      // Call clearActiveTimeouts
      testGame.clearActiveTimeouts();
      
      // Verify timeouts were cleared
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout1);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout2);
      expect(testGame.activeTimeouts).toHaveLength(0);
      
      // Clean up
      clearTimeoutSpy.mockRestore();
      testGame.destroy();
    });

    test('should set gameboard dimensions', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Mock canvas dimensions
      testGame.canvas.width = 0;
      testGame.canvas.height = 0;
      
      // Call setGameboardDimensions
      testGame.setGameboardDimensions();
      
      // Verify dimensions are set
      expect(testGame.canvas.width).toBeGreaterThan(0);
      expect(testGame.canvas.height).toBeGreaterThan(0);
      
      testGame.destroy();
    });

    test('should initialize the game', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Mock methods
      testGame.initializeBoard = jest.fn().mockReturnValue([]);
      testGame.initializeControlledNodes = jest.fn();
      
      // Call initGame
      testGame.initGame();
      
      // Verify initialization methods were called
      expect(testGame.initializeBoard).toHaveBeenCalled();
      expect(testGame.initializeControlledNodes).toHaveBeenCalled();
      
      testGame.destroy();
    });

    test('should initialize the game board', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Call initializeBoard with a specific number of nodes
      const numNodes = 5;
      const nodes = testGame.initializeBoard(numNodes);
      
      // Verify the correct number of nodes were created
      expect(nodes).toHaveLength(numNodes);
      
      // Verify each node has required properties
      nodes.forEach(node => {
        expect(node).toHaveProperty('x');
        expect(node).toHaveProperty('y');
        expect(node).toHaveProperty('radius');
        expect(node).toHaveProperty('units');
        expect(node).toHaveProperty('owner');
        expect(node).toHaveProperty('color');
      });
      
      testGame.destroy();
    });

    test('should calculate distance between nodes', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Test with known values (3-4-5 triangle)
      const node1 = { x: 0, y: 0 };
      const node2 = { x: 3, y: 4 };
      
      const distance = testGame.distanceBetweenNodes(node1, node2);
      expect(distance).toBe(5);
      
      testGame.destroy();
    });

    test('should handle continuous unit flow for player and computer', () => {
      const testGame = new Game('gameCanvas', 12345);
      
      // Set up test nodes
      const playerNode = { 
        owner: 'player', 
        destination: { owner: 'computer', x: 100, y: 100 }, 
        units: 10, 
        x: 0, 
        y: 0 
      };
      const computerNode = { 
        owner: 'computer', 
        units: 15, 
        x: 200, 
        y: 200,
        destination: null
      };
      const targetNode = { 
        owner: 'player', 
        units: 5, 
        x: 300, 
        y: 300,
        destination: null
      };
      
      testGame.nodes = [playerNode, computerNode, targetNode];
      testGame.gameActive = true;
      
      // Mock dependencies
      testGame.sendUnits = jest.fn();
      testGame.findTargetNode = jest.fn().mockReturnValue(targetNode);
      testGame.isPathBlocked = jest.fn().mockReturnValue(false);
      
      // First test - only player should send units (computer can't act yet)
      testGame.computerCanAct = false;
      testGame.handleContinuousFlow();
      
      // Verify only player sent units
      expect(testGame.sendUnits).toHaveBeenCalledTimes(1);
      expect(testGame.sendUnits).toHaveBeenCalledWith(
        playerNode, 
        playerNode.destination, 
        expect.any(Number)
      );
      
      // Reset mocks
      testGame.sendUnits.mockClear();
      
      // Second test - computer can act and should send units
      testGame.computerCanAct = true;
      testGame.computerLastCaptureTime = Date.now() - (cfg.COMPUTER_DELAY_NEW_BASE + 1000);
      testGame.handleContinuousFlow();
      
      // Verify both player and computer sent units
      expect(testGame.sendUnits).toHaveBeenCalledTimes(2);
      expect(testGame.findTargetNode).toHaveBeenCalledWith(computerNode);
      
      // Verify computer node's destination was set
      expect(computerNode.destination).toBe(targetNode);
      
      testGame.destroy();
    });
  });
});

// End of main describe block

// Add this to ensure all describe blocks are properly closed
describe('Additional Tests', () => {
  // This is a placeholder to ensure all tests are properly nested
  // and all describe blocks are closed
});
