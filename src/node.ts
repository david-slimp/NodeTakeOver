// src/node.ts

import { cfg } from './config';

/**
 * Represents the possible owners of a node in the game.
 * - 'player': Node is controlled by the human player
 * - 'computer': Node is controlled by the AI
 * - null: Node is neutral/uncontrolled
 */
export type NodeOwner = 'player' | 'computer' | null;

/**
 * Represents a node in the game, handling data and game logic only.
 * Each node has a position, unit count, owner, and other game-related properties.
 * Rendering is handled by the NodeRenderer class.
 * 
 * @property {number} x - The x-coordinate of the node's center
 * @property {number} y - The y-coordinate of the node's center
 * @property {number} units - Current number of units in the node
 * @property {string} color - The color of the node (based on owner)
 * @property {NodeOwner} owner - The current owner of the node (player, computer, or neutral)
 * @property {number} maxUnits - Maximum number of units this node can hold
 * @property {number} generationSpeed - How quickly this node generates new units
 * @property {Node | null} destination - The node this node is sending units to (if any)
 * @property {Node | null} next - The next node in the chain (used for pathfinding/rendering)
 * @property {number} radius - The visual radius of the node
 */
export class Node {
    x: number;
    y: number;
    units: number;
    color: string;
    owner: NodeOwner;
    maxUnits: number;
    generationSpeed: number;
    destination: Node | null;
    next: Node | null;
    radius: number;

    /**
     * Creates a new Node instance.
     * 
     * @param {number} x - The x-coordinate of the node's center
     * @param {number} y - The y-coordinate of the node's center
     * @param {number} units - Initial number of units in the node
     * @param {string} color - The color of the node
     * @param {NodeOwner} [owner=null] - The initial owner of the node (defaults to neutral)
     * @param {number} [radius=cfg.nodeRadius] - The visual radius of the node
     */
    constructor(x: number, y: number, units: number, color: string, owner: NodeOwner = null, radius: number = cfg.nodeRadius) {
        this.x = x;
        this.y = y;
        this.units = units;
        this.color = color;
        this.owner = owner;
        this.radius = radius;
        this.maxUnits = owner ? cfg.MAX_UNITS : cfg.UNCONTROLLED_MAX_UNITS;
        this.generationSpeed = owner === 'player'
            ? cfg.PLAYER_UNIT_GENERATION_SPEED
            : owner === 'computer'
                ? cfg.COMPUTER_UNIT_GENERATION_SPEED
                : cfg.UNCONTROLLED_UNIT_GENERATION_SPEED;
        this.destination = null;
        this.next = null;

        if (cfg.VERBOSE >= 2) {
            console.log('Node created at:', { x, y, color, owner });
        }
    }

    /**
     * Finds and returns the first node at the specified coordinates.
     * 
     * @static
     * @param {number} x - The x-coordinate to check
     * @param {number} y - The y-coordinate to check
     * @param {Node[]} nodes - Array of nodes to search through
     * @returns {Node | undefined} The node at the specified coordinates, or undefined if none found
     */
    static getNodeAt(x: number, y: number, nodes: Node[]): Node | undefined {
        return nodes.find(
            (node) =>
                Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)) <=
                node.radius
        );
    }

    /**
     * Creates a chain of nodes by connecting each node to its nearest neighbor.
     * This is used to create a path through all nodes for game mechanics.
     * 
     * @static
     * @param {Node[]} nodes - Array of nodes to connect in a chain
     * @returns {Node[]} The first node in the chain (with 'next' properties linking to subsequent nodes)
     * 
     * @example
     * // Returns a chain: node1 -> node2 -> node3 -> node1
     * const chain = Node.createNodeChain([node1, node2, node3]);
     */
    static createNodeChain(nodes: Node[]): Node[] {
        if (nodes.length === 0) return [];
        
        console.log('Creating node chain with', nodes.length, 'nodes');
        
        // Reset the 'next' property for all nodes
        nodes.forEach((node) => (node.next = null));

        // Start from the first node in the list
        const chain: Node[] = [nodes[0]];
        let currentNode = nodes[0];

        while (chain.length < nodes.length) {
            let nearestNode = null;
            let nearestDistance = Infinity;

            nodes.forEach((node) => {
                if (!chain.includes(node)) {
                    const distance = Node.distanceBetweenNodes(currentNode, node);
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestNode = node;
                    }
                }
            });

            if (nearestNode) {
                currentNode.next = nearestNode;
                chain.push(nearestNode);
                currentNode = nearestNode;
            }
        }
        
        console.log('Node chain created with', chain.length, 'nodes');
        return chain;
    }

    /**
     * Calculates the Euclidean distance between two nodes.
     * 
     * @static
     * @param {Node} node1 - The first node
     * @param {Node} node2 - The second node
     * @returns {number} The distance between the two nodes
     */
    static distanceBetweenNodes(node1: Node, node2: Node): number {
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculates the distance from this node to another node.
     * 
     * @param {Node} other - The other node to measure distance to
     * @returns {number} The distance to the other node
     */
    distanceTo(other: Node): number {
        return Node.distanceBetweenNodes(this, other);
    }

    /**
     * Checks if the given point (x,y) is within this node's boundaries.
     * 
     * @param {number} x - The x-coordinate of the point to check
     * @param {number} y - The y-coordinate of the point to check
     * @returns {boolean} True if the point is inside the node's radius, false otherwise
     */
    contains(x: number, y: number): boolean {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    }
}
