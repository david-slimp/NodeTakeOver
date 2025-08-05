const { Node } = require('../src/node');
const { cfg } = require('../src/config');

// Helper function to count nodes in a chain starting from a given node
const countNodesInChain = (startNode) => {
  let count = 0;
  let current = startNode;
  const visited = new Set();
  
  while (current && !visited.has(current)) {
    visited.add(current);
    current = current.next;
    count++;
  }
  
  return count;
};

describe('Node', () => {
  let node;
  let ctx;
  
  // Mock canvas context with direct property tracking
  beforeEach(() => {
    // Store all property changes in order
    const propertyHistory = [];
    
    // Helper to track property changes
    const trackProperty = (prop, value) => {
      propertyHistory.push({ prop, value });
      return value;
    };
    
    // Mock canvas context with property tracking
    const mockCtx = {
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn(),
      
      // Track property assignments with direct property storage
      _properties: {
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: ''
      },
      
      // Property getters/setters
      set fillStyle(value) {
        this._properties.fillStyle = trackProperty('fillStyle', value);
      },
      get fillStyle() {
        return this._properties.fillStyle;
      },
      
      set font(value) {
        this._properties.font = trackProperty('font', value);
      },
      get font() {
        return this._properties.font;
      },
      
      set textAlign(value) {
        this._properties.textAlign = trackProperty('textAlign', value);
      },
      get textAlign() {
        return this._properties.textAlign;
      },
      
      set textBaseline(value) {
        this._properties.textBaseline = trackProperty('textBaseline', value);
      },
      get textBaseline() {
        return this._properties.textBaseline;
      },
      
      // For testing
      _getPropertyHistory: () => [...propertyHistory],
      _getProperty: (prop) => mockCtx._properties[prop]
    };
    
    ctx = mockCtx;
    
    // Reset config to default values
    cfg.nodeRadius = 30;
    cfg.MAX_UNITS = 100;
    cfg.UNCONTROLLED_MAX_UNITS = 0.75;
    cfg.PLAYER_UNIT_GENERATION_SPEED = 6;
    cfg.COMPUTER_UNIT_GENERATION_SPEED = 6;
    cfg.UNCONTROLLED_UNIT_GENERATION_SPEED = 3;
  });

  describe('constructor', () => {
    it('should initialize with provided values', () => {
      node = new Node(100, 150, 50, '#ff0000', 'player');
      
      expect(node.x).toBe(100);
      expect(node.y).toBe(150);
      expect(node.units).toBe(50);
      expect(node.color).toBe('#ff0000');
      expect(node.owner).toBe('player');
      expect(node.maxUnits).toBe(cfg.MAX_UNITS);
      expect(node.generationSpeed).toBe(cfg.PLAYER_UNIT_GENERATION_SPEED);
      expect(node.destination).toBeNull();
      expect(node.next).toBeNull();
    });

    it('should set computer generation speed for computer owner', () => {
      node = new Node(0, 0, 0, '#ff0000', 'computer');
      expect(node.generationSpeed).toBe(cfg.COMPUTER_UNIT_GENERATION_SPEED);
    });

    it('should set uncontrolled generation speed for no owner', () => {
      node = new Node(0, 0, 0, '#ff0000');
      expect(node.generationSpeed).toBe(cfg.UNCONTROLLED_UNIT_GENERATION_SPEED);
      expect(node.maxUnits).toBe(cfg.UNCONTROLLED_MAX_UNITS);
    });
  });

  describe('draw', () => {
    let originalFillStyle, originalFont, originalTextAlign, originalTextBaseline;
    
    beforeEach(() => {
      // Save original context properties
      originalFillStyle = ctx.fillStyle;
      originalFont = ctx.font;
      originalTextAlign = ctx.textAlign;
      originalTextBaseline = ctx.textBaseline;
      
      // Create a node with known values
      node = new Node(100, 150, 50, '#ff0000', 'player');
      
      // Reset all mock functions before each test
      jest.clearAllMocks();
    });
    
    afterEach(() => {
      // Restore original context properties
      ctx.fillStyle = originalFillStyle;
      ctx.font = originalFont;
      ctx.textAlign = originalTextAlign;
      ctx.textBaseline = originalTextBaseline;
    });

    it('should draw a circle with the correct properties', () => {
      // Spy on fillStyle setter to track when it's set to the node's color
      const originalFillStyle = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(ctx),
        'fillStyle'
      );
      
      const fillStyleSpy = jest.spyOn(ctx, 'fillStyle', 'set');
      
      node.draw(ctx);
      
      // Verify circle is drawn with correct parameters
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalledWith(100, 150, cfg.nodeRadius, 0, Math.PI * 2);
      
      // Verify the circle is filled and stroked
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      
      // Verify fillStyle was set to the node's color at some point
      expect(fillStyleSpy).toHaveBeenCalledWith(node.color);
      
      // Clean up spy
      fillStyleSpy.mockRestore();
    });

    it('should display the unit count in a larger font', () => {
      node.draw(ctx);
      
      // Check that fillText was called with the unit count
      expect(ctx.fillText).toHaveBeenCalledWith(
        Math.floor(node.units).toString(),
        node.x,
        node.y
      );
      
      // Verify the font was set correctly for unit count
      const fontHistory = ctx._getPropertyHistory()
        .filter(change => change.prop === 'font')
        .map(change => change.value);
      
      expect(fontHistory).toContain('16px Arial');
    });
    
    it('should display the generation speed in a smaller font below the unit count', () => {
      node.draw(ctx);
      
      // Check that fillText was called with the generation speed
      expect(ctx.fillText).toHaveBeenCalledWith(
        node.generationSpeed.toString(),
        node.x,
        node.y + 14
      );
      
      // Verify the font was set correctly for generation speed
      const fontHistory = ctx._getPropertyHistory()
        .filter(change => change.prop === 'font')
        .map(change => change.value);
      
      expect(fontHistory).toContain('10px Arial');
    });
    
    it('should center the text both horizontally and vertically', () => {
      node.draw(ctx);
      
      // Text should be centered
      expect(ctx.textAlign).toBe('center');
      expect(ctx.textBaseline).toBe('middle');
    });
  });

  describe('getNodeAt', () => {
    let nodes;
    
    beforeEach(() => {
      nodes = [
        new Node(100, 100, 10, '#ff0000'),
        new Node(200, 200, 20, '#00ff00'),
        new Node(300, 300, 30, '#0000ff')
      ];
    });

    it('should find a node at the given coordinates', () => {
      const foundNode = Node.getNodeAt(105, 105, nodes);
      expect(foundNode).toBe(nodes[0]);
    });

    it('should return undefined if no node is found at the coordinates', () => {
      const foundNode = Node.getNodeAt(400, 400, nodes);
      expect(foundNode).toBeUndefined();
    });
  });

  describe('createNodeChain', () => {
    let nodes;
    
    beforeEach(() => {
      // Create nodes in a predictable order
      nodes = [
        new Node(0, 0, 10, '#ff0000'),      // node1 at origin
        new Node(100, 0, 20, '#00ff00'),    // node2 to the right of node1
        new Node(50, 86.6, 30, '#0000ff')   // node3 forming an equilateral triangle
      ];
      
      // Mock console.log to prevent test output clutter
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
      // Restore console.log
      console.log.mockRestore();
    });

    it('should create a chain that connects all nodes in a single path', () => {
      // Create the chain
      const chain = Node.createNodeChain([...nodes]);
      
      // Should include all nodes
      expect(chain.length).toBe(nodes.length);
      
      // All nodes should be in the chain exactly once
      nodes.forEach(node => {
        expect(chain).toContain(node);
      });
      
      // The chain should form a valid path where each node points to the next
      for (let i = 0; i < chain.length - 1; i++) {
        expect(chain[i].next).toBe(chain[i + 1]);
      }
      
      // The last node should not have a next node
      expect(chain[chain.length - 1].next).toBeNull();
      
      // The chain should include all nodes (no nodes were skipped)
      const nodeSet = new Set(chain);
      expect(nodeSet.size).toBe(nodes.length);
    });

    it('should ensure all nodes are accessible in the chain', () => {
      // Create the chain
      const chain = Node.createNodeChain([...nodes]);
      
      // Count how many nodes are reachable from the first node
      const reachableCount = countNodesInChain(chain[0]);
      
      // All nodes should be reachable
      expect(reachableCount).toBe(nodes.length);
    });
    
    it('should handle a single node', () => {
      const singleNode = [new Node(0, 0, 10, '#ff0000')];
      const chain = Node.createNodeChain(singleNode);
      
      expect(chain.length).toBe(1);
      expect(chain[0].next).toBeNull();
    });
  });

  describe('distanceBetweenNodes', () => {
    let node1, node2;
    
    beforeEach(() => {
      node1 = new Node(0, 0, 10, '#ff0000');
      node2 = new Node(3, 4, 20, '#00ff00');
    });

    it('should calculate the correct distance between two nodes', () => {
      // 3-4-5 triangle
      const distance = Node.distanceBetweenNodes(node1, node2);
      expect(distance).toBe(5);
    });

    it('should return 0 for the same node', () => {
      const distance = Node.distanceBetweenNodes(node1, node1);
      expect(distance).toBe(0);
    });
  });
});
