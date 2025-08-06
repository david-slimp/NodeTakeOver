// src/NodeRenderer.ts

import { Node } from './node';

/**
 * Handles all rendering logic for Node objects.
 * This class is responsible for the visual representation of nodes and their connections,
 * separating rendering concerns from the core game logic in the Node class.
 * 
 * @property {CanvasRenderingContext2D} ctx - The 2D rendering context for the canvas
 */
export class NodeRenderer {
    /**
     * Creates a new NodeRenderer instance.
     * 
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context to use for drawing
     */
    constructor(private ctx: CanvasRenderingContext2D) {}

    /**
     * Draws a single node on the canvas.
     * This includes the node's circle, unit count, and generation speed.
     * 
     * @param {Node} node - The node to render
     * @returns {void}
     * 
     * @example
     * // Draw a node at (100, 100) with 5 units
     * const node = new Node(100, 100, 5, '#ff0000', 'player');
     * renderer.drawNode(node);
     */
    drawNode(node: Node): void {
        // Draw the node circle
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = node.color;
        this.ctx.fill();
        this.ctx.stroke();

        // Show # units in node
        this.ctx.fillStyle = '#000';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(Math.floor(node.units).toString(), node.x, node.y);

        // Show generate speed in node
        this.ctx.font = '10px Arial';
        this.ctx.fillText(node.generationSpeed.toString(), node.x, node.y + 14);
    }

    /**
     * Draws connecting lines between nodes that are linked in a chain.
     * This visually represents the connections between nodes that can send units to each other.
     * 
     * @param {Node[]} nodes - Array of nodes to draw connections for
     * @returns {void}
     * 
     * @example
     * // Draw connections between nodes in a chain
     * const node1 = new Node(100, 100, 5, '#ff0000');
     * const node2 = new Node(200, 200, 3, '#00ff00');
     * node1.next = node2;
     * renderer.drawNodeChain([node1, node2]);
     */
    drawNodeChain(nodes: Node[]): void {
        console.log('draw Node Chain');
        nodes
            .filter((node) => node.next)
            .forEach((node) => {
                if (!node.next) return;
                
                this.ctx.beginPath();
                this.ctx.moveTo(node.x, node.y);
                this.ctx.lineTo(node.next.x, node.next.y);
                this.ctx.strokeStyle = '#000'; // canvas bgcolor is #dde otherwise use yellow
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            });
    }
}
