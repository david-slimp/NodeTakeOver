import { Wall } from '../src/wall';
import { Node } from '../src/node';
import { cfg } from '../src/config';

// Mock the config values
jest.mock('../src/config', () => ({
  cfg: {
    VERBOSE: 0,
    WALL_COLOR: '#000000',
    WALL_WIDTH: 2,
    width: 800,
    height: 600,
    nodeRadius: 20,
    wallMaxLength: 100
  }
}));

describe('Wall', () => {
  let wall: Wall;
  let mockCtx: jest.Mocked<CanvasRenderingContext2D>;
  
  beforeEach(() => {
    wall = new Wall(10, 20, 30, 40);
    
    // Mock CanvasRenderingContext2D
    mockCtx = {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      strokeStyle: '',
      lineWidth: 0,
    } as unknown as jest.Mocked<CanvasRenderingContext2D>;
  });

  describe('constructor', () => {
    it('should create a wall with the given coordinates', () => {
      expect(wall.x1).toBe(10);
      expect(wall.y1).toBe(20);
      expect(wall.x2).toBe(30);
      expect(wall.y2).toBe(40);
    });
  });

  describe('draw', () => {
    it('should draw the wall on the canvas', () => {
      wall.draw(mockCtx);
      
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 20);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(30, 40);
      expect(mockCtx.strokeStyle).toBe('#000000');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('generateWalls', () => {
    it('should generate the specified number of walls', () => {
      const nodes: Node[] = [];
      const chain: Node[] = [];
      const rng = jest.fn().mockReturnValue(0.5);
      
      const walls = Wall.generateWalls(3, nodes, chain, rng);
      
      expect(walls).toHaveLength(3);
      expect(walls[0]).toBeInstanceOf(Wall);
    });
  });

  describe('createWall', () => {
    it('should create a wall with random position and length', () => {
      const rng = jest.fn()
        .mockReturnValueOnce(0.5) // length factor
        .mockReturnValueOnce(0.25) // angle factor
        .mockReturnValueOnce(0.3) // x1
        .mockReturnValueOnce(0.4); // y1
      
      const wall = Wall.createWall(rng);
      
      // Verify the wall was created with expected values
      expect(wall).toBeInstanceOf(Wall);
      expect(wall.x1).toBe(240); // 800 * 0.3
      expect(wall.y1).toBe(240); // 600 * 0.4
      // Calculate expected values based on the implementation
      const length = 0.5 * (cfg.wallMaxLength * 0.3) + cfg.wallMaxLength * 0.1;
      const angle = 0.25 * Math.PI * 2;
      expect(wall.x2).toBeCloseTo(wall.x1 + length * Math.cos(angle), 5);
      expect(wall.y2).toBeCloseTo(wall.y1 + length * Math.sin(angle), 5);
    });
  });

  describe('isWallPositionValid', () => {
    let nodes: Node[];
    let chain: Node[];
    let existingWalls: Wall[];
    
    beforeEach(() => {
      // Create some test nodes
      nodes = [
        new Node(100, 100, 0, '#000000'),
        new Node(200, 200, 0, '#000000')
      ];
      
      // Create a simple chain
      chain = [...nodes];
      
      // Create some existing walls
      existingWalls = [
        new Wall(300, 100, 400, 200)
      ];
    });
    
    it('should return false if wall is too close to a node', () => {
      // Create a wall too close to the first node
      const wall = new Wall(110, 110, 150, 150);
      
      const isValid = Wall.isWallPositionValid(wall, existingWalls, nodes, chain);
      
      expect(isValid).toBe(false);
    });
    
    it('should return false if wall intersects with existing walls', () => {
      // Create a wall that intersects with the existing wall
      const wall = new Wall(350, 50, 350, 250);
      
      const isValid = Wall.isWallPositionValid(wall, existingWalls, nodes, chain);
      
      expect(isValid).toBe(false);
    });
    
    it('should return false if wall blocks the node chain', () => {
      // Create a wall that would block the chain between nodes
      const wall = new Wall(150, 150, 150, 250);
      
      const isValid = Wall.isWallPositionValid(wall, existingWalls, nodes, chain);
      
      expect(isValid).toBe(false);
    });
    
    it('should return true for a valid wall position', () => {
      // Create a wall that doesn't interfere with anything
      const wall = new Wall(400, 400, 450, 450);
      
      const isValid = Wall.isWallPositionValid(wall, existingWalls, nodes, chain);
      
      expect(isValid).toBe(true);
    });
  });

  describe('distanceFromPointToLine', () => {
    it('should calculate the distance from a point to a line', () => {
      // Test with a horizontal line
      const distance = Wall['distanceFromPointToLine'](5, 5, 0, 0, 10, 0);
      expect(distance).toBe(5);
      
      // Test with a vertical line
      const distance2 = Wall['distanceFromPointToLine'](5, 5, 0, 0, 0, 10);
      expect(distance2).toBe(5);
    });
  });

  describe('doLinesIntersect', () => {
    it('should return true if lines intersect', () => {
      // Test with intersecting lines
      const intersects = Wall['doLinesIntersect'](
        0, 0, 10, 10,  // Line 1: (0,0) to (10,10)
        0, 10, 10, 0    // Line 2: (0,10) to (10,0)
      );
      expect(intersects).toBe(true);
    });
    
    it('should return false if lines do not intersect', () => {
      // Test with non-intersecting lines
      const intersects = Wall['doLinesIntersect'](
        0, 0, 10, 0,    // Line 1: (0,0) to (10,0)
        0, 10, 10, 10   // Line 2: (0,10) to (10,10)
      );
      expect(intersects).toBe(false);
    });
  });
});
