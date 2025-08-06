const { Node } = require('../src/node');
const { NodeRenderer } = require('../src/NodeRenderer');
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
  let nodeRenderer;
  
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
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      
      // Track property assignments with direct property storage
      _properties: {
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        strokeStyle: '',
        lineWidth: 1
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
      
      set strokeStyle(value) {
        this._properties.strokeStyle = trackProperty('strokeStyle', value);
      },
      get strokeStyle() {
        return this._properties.strokeStyle;
      },
      
      set lineWidth(value) {
        this._properties.lineWidth = trackProperty('lineWidth', value);
      },
      get lineWidth() {
        return this._properties.lineWidth;
      },
      
      // For testing
      _getPropertyHistory: () => [...propertyHistory],
      _getProperty: (prop) => mockCtx._properties[prop]
    };
    
    ctx = mockCtx;
    nodeRenderer = new NodeRenderer(ctx);
    
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

  describe('Node properties', () => {
    it('should have default radius from config when not specified', () => {
      const node = new Node(0, 0, 0, '#000000');
      expect(node.radius).toBe(cfg.nodeRadius);
    });

    it('should use provided radius when specified', () => {
      const customRadius = 20;
      const node = new Node(0, 0, 0, '#000000', null, customRadius);
      expect(node.radius).toBe(customRadius);
    });
  });

  describe('distanceTo', () => {
    it('should calculate distance to another node', () => {
      const node1 = new Node(0, 0, 0, '#000000');
      const node2 = new Node(3, 4, 0, '#ffffff');
      expect(node1.distanceTo(node2)).toBe(5); // 3-4-5 triangle
    });
  });

  describe('contains', () => {
    let node;
    
    beforeEach(() => {
      node = new Node(100, 100, 0, '#000000', null, 20);
    });
    
    it('should return true for point inside node', () => {
      expect(node.contains(100, 100)).toBe(true);
      expect(node.contains(115, 100)).toBe(true);
      expect(node.contains(100, 115)).toBe(true);
      expect(node.contains(85, 100)).toBe(true);
      expect(node.contains(100, 85)).toBe(true);
    });
    
    it('should return false for point outside node', () => {
      expect(node.contains(200, 200)).toBe(false);
      expect(node.contains(121, 100)).toBe(false);
      expect(node.contains(100, 121)).toBe(false);
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

  describe('NodeRenderer', () => {
    let nodes;
    
    beforeEach(() => {
      // Create a simple chain of 3 connected nodes
      nodes = [
        new Node(100, 100, 10, '#ff0000'),
        new Node(200, 200, 20, '#00ff00'),
        new Node(300, 100, 30, '#0000ff')
      ];
      
      // Link the nodes in a chain
      nodes[0].next = nodes[1];
      nodes[1].next = nodes[2];
      
      // Reset all mock functions before each test
      jest.clearAllMocks();
    });

    describe('drawNode', () => {
      let node;
      
      beforeEach(() => {
        node = new Node(100, 100, 50, '#ff0000', 'player', 30);
        jest.clearAllMocks();
      });

      it('should draw a circle with the correct properties', () => {
        // Spy on fillStyle setter to track when it's set to the node's color
        const fillStyleSpy = jest.spyOn(ctx, 'fillStyle', 'set');
        
        nodeRenderer.drawNode(node);
        
        // Verify circle is drawn with correct parameters
        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.arc).toHaveBeenCalledWith(
          node.x, 
          node.y, 
          node.radius, 
          0, 
          Math.PI * 2
        );
        
        // Verify the circle is filled and stroked
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.stroke).toHaveBeenCalled();
        
        // Verify fillStyle was set to the node's color
        expect(fillStyleSpy).toHaveBeenCalledWith(node.color);
        
        // Clean up spy
        fillStyleSpy.mockRestore();
      });

      it('should display the unit count and generation speed', () => {
        nodeRenderer.drawNode(node);
        
        // Check that fillText was called with the unit count and generation speed
        expect(ctx.fillText).toHaveBeenCalledWith(
          Math.floor(node.units).toString(),
          node.x,
          node.y
        );
        
        expect(ctx.fillText).toHaveBeenCalledWith(
          node.generationSpeed.toString(),
          node.x,
          node.y + 14
        );
      });
    });

    describe('drawNodeChain', () => {
      it('should draw lines between connected nodes', () => {
        // Call the method we're testing
        nodeRenderer.drawNodeChain(nodes);
        
        // Verify beginPath was called for each line
        expect(ctx.beginPath).toHaveBeenCalledTimes(2); // 3 nodes = 2 connections
        
        // Verify moveTo and lineTo were called with correct coordinates
        expect(ctx.moveTo).toHaveBeenNthCalledWith(1, nodes[0].x, nodes[0].y);
        expect(ctx.lineTo).toHaveBeenNthCalledWith(1, nodes[1].x, nodes[1].y);
        
        expect(ctx.moveTo).toHaveBeenNthCalledWith(2, nodes[1].x, nodes[1].y);
        expect(ctx.lineTo).toHaveBeenNthCalledWith(2, nodes[2].x, nodes[2].y);
        
        // Verify stroke was called for each line
        expect(ctx.stroke).toHaveBeenCalledTimes(2);
      });

      it('should use the correct stroke style and line width', () => {
        nodeRenderer.drawNodeChain(nodes);
        
        // Verify stroke style and line width are set correctly
        expect(ctx.strokeStyle).toBe('#000');
        expect(ctx.lineWidth).toBe(2);
      });

      it('should not draw anything if there are no nodes', () => {
        nodeRenderer.drawNodeChain([]);
        
        // Verify no drawing operations were performed
        expect(ctx.beginPath).not.toHaveBeenCalled();
        expect(ctx.moveTo).not.toHaveBeenCalled();
        expect(ctx.lineTo).not.toHaveBeenCalled();
        expect(ctx.stroke).not.toHaveBeenCalled();
      });

      it('should not draw anything if there is only one node', () => {
        const singleNode = [new Node(100, 100, 10, '#ff0000')];
        nodeRenderer.drawNodeChain(singleNode);
        
        // Verify no drawing operations were performed
        expect(ctx.beginPath).not.toHaveBeenCalled();
        expect(ctx.moveTo).not.toHaveBeenCalled();
        expect(ctx.lineTo).not.toHaveBeenCalled();
        expect(ctx.stroke).not.toHaveBeenCalled();
      });

      it('should handle nodes with no next node', () => {
        // Break the chain after the first node
        nodes[0].next = nodes[1];
        nodes[1].next = null;
        
        nodeRenderer.drawNodeChain(nodes);
        
        // Should only draw one line (between nodes[0] and nodes[1])
        expect(ctx.beginPath).toHaveBeenCalledTimes(1);
        expect(ctx.moveTo).toHaveBeenCalledWith(nodes[0].x, nodes[0].y);
        expect(ctx.lineTo).toHaveBeenCalledWith(nodes[1].x, nodes[1].y);
        expect(ctx.stroke).toHaveBeenCalledTimes(1);
      });
    });
  });
});
