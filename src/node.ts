// src/node.ts

import { cfg } from './config';

export type NodeOwner = 'player' | 'computer' | null;

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

    constructor(x: number, y: number, units: number, color: string, owner: NodeOwner = null, nodeRadius?: number) {
        this.x = x;
        this.y = y;
        this.units = units;
        this.color = color;
        this.owner = owner;
        // this.nodeRadius = nodeRadius;  // store nodeRadius here
        this.maxUnits = owner ? cfg.MAX_UNITS : cfg.UNCONTROLLED_MAX_UNITS;
        this.generationSpeed = owner === 'player'
            ? cfg.PLAYER_UNIT_GENERATION_SPEED
            : owner === 'computer'
                ? cfg.COMPUTER_UNIT_GENERATION_SPEED
                : cfg.UNCONTROLLED_UNIT_GENERATION_SPEED;
        this.destination = null;
        this.next = null; // New property to store the next node in the chain

        if (cfg.VERBOSE >= 2) {
            console.log('X:', x, '   Y:', y, '  COLOR:', color);
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        // Draw the node circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, cfg.nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();

        // Show # units in node
        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(this.units).toString(), this.x, this.y);

        // Show generate speed in node
        ctx.font = '10px Arial';
        ctx.fillText(this.generationSpeed.toString(), this.x, this.y + 14);
    }

    /**
     * Get the node at X/Y location
     */
    static getNodeAt(x: number, y: number, nodes: Node[]): Node | undefined {
        return nodes.find(
            (node) =>
                Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)) <=
                cfg.nodeRadius
        );
    }

    /**
     * Create a chain of nodes by connecting nearest neighbors
     */
    static createNodeChain(nodes: Node[]): Node[] {
        console.log('create Node Chain');
        // Reset the 'next' property for all nodes
        nodes.forEach((node) => (node.next = null));

        // Start from the first node in the list
        const chain: Node[] = [];
        let currentNode = nodes[0];
        chain.push(currentNode);

        while (chain.length < nodes.length) {
            console.log('createNodeChain length:', nodes.length);
            let nearestNode = null;
            let nearestDistance = Infinity;

            nodes.forEach((node) => {
                if (!chain.includes(node)) {
                    const distance = Node.distanceBetweenNodes(
                        currentNode,
                        node,
                    );
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
        console.log('returning NodeChain');
        return chain;
    }

    /**
     * Calculate the distance between two nodes
     */
    static distanceBetweenNodes(node1: Node, node2: Node): number {
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Draw lines between connected nodes in the chain
     */
    static drawNodeChain(ctx: CanvasRenderingContext2D, nodes: Node[]): void {
        console.log('draw Node Chain');
        nodes
            .filter((node) => node.next)
            .forEach((node) => {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.next!.x, node.next!.y);
                ctx.strokeStyle = '#000'; // canvas bgcolor is #dde otherwise use yellow
                ctx.lineWidth = 2;
                ctx.stroke();
            });
    }
}
