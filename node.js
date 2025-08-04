// node.js

import {cfg} from './config.js';

export class Node {
    constructor(x, y, units, color, owner = null, nodeRadius) {
        this.x = x;
        this.y = y;
        this.units = units;
        this.color = color;
        this.owner = owner;
        // this.nodeRadius = nodeRadius;  // store nodeRadius here
        this.maxUnits = owner ? cfg.MAX_UNITS : cfg.UNCONTROLLED_MAX_UNITS;
        this.generationSpeed =
            owner === 'player'
                ? cfg.PLAYER_UNIT_GENERATION_SPEED
                : owner === 'computer'
                  ? cfg.COMPUTER_UNIT_GENERATION_SPEED
                  : cfg.UNCONTROLLED_UNIT_GENERATION_SPEED;
        this.destination = null;
        this.next = null; // New property to store the next node in the chain

        cfg.VERBOSE >= 2 && console.log('X:', x, '   Y:', y, '  COLOR:', color);
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, cfg.nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();

        // show # units in node
        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(this.units), this.x, this.y);

        // show generate speed in node
        ctx.font = '10px Arial';
        ctx.fillText(this.generationSpeed, this.x, this.y + 14);
    }

    // Get the node at X/Y location
    static getNodeAt(x, y, nodes) {
        return nodes.find(
            (node) =>
                Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)) <=
                cfg.nodeRadius,
        );
    }

    // Method to create the chain of nodes
    static createNodeChain(nodes) {
        console.log('create Node Chain');
        // Reset the 'next' property for all nodes
        nodes.forEach((node) => (node.next = null));

        // Start from the first node in the list
        const chain = [];
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

    // Static method to calculate the distance between two nodes
    static distanceBetweenNodes(node1, node2) {
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Method to draw the chain of nodes
    static drawNodeChain(ctx, nodes) {
        console.log('draw Node Chain');
        nodes
            .filter((node) => node.next)
            .forEach((node) => {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.next.x, node.next.y);
                ctx.strokeStyle = '#000'; // canvas bgcolor is #dde otherwise use yellow
                ctx.lineWidth = 2;
                ctx.stroke();
            });
    }
}
