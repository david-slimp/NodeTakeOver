// wall.ts

import { cfg, rngInstance } from './config';
import type { Node } from './node';

/**
 * Represents a wall in the game that can block movement between nodes.
 * Walls are line segments defined by two points (x1,y1) and (x2,y2).
 * They are used as obstacles that affect unit movement and pathfinding.
 */
export class Wall {
    /** The x-coordinate of the starting point of the wall */
    readonly x1: number;
    
    /** The y-coordinate of the starting point of the wall */
    readonly y1: number;
    
    /** The x-coordinate of the ending point of the wall */
    readonly x2: number;
    
    /** The y-coordinate of the ending point of the wall */
    readonly y2: number;

    /**
     * Creates a new Wall instance with the specified coordinates.
     * These coordinates are immutable after creation.
     * 
     * @param x1 - The x-coordinate of the starting point
     * @param y1 - The y-coordinate of the starting point
     * @param x2 - The x-coordinate of the ending point
     * @param y2 - The y-coordinate of the ending point
     */
    constructor(x1: number, y1: number, x2: number, y2: number) {
        cfg.VERBOSE > 2 && console.log('wall.ts - constructor');
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    /**
     * Draws the wall on the provided canvas context.
     * 
     * @param ctx - The canvas rendering context to draw on
     */
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.strokeStyle = cfg.WALL_COLOR;
        ctx.lineWidth = cfg.WALL_WIDTH;
        ctx.stroke();
    }

    /**
     * Generates a specified number of walls that don't interfere with nodes or existing walls.
     * This method ensures that walls are placed in valid positions that don't block the main chain.
     * 
     * @param count - The number of walls to generate
     * @param nodes - Array of all nodes in the game
     * @param chain - The main chain of nodes that should not be blocked
     * @param rng - A random number generator function for wall placement
     * @returns An array of generated Wall instances
     * 
     * @throws {Error} If unable to place all requested walls after maximum attempts
     */
    static generateWalls(count: number, nodes: Node[], chain: Node[], rng: () => number): Wall[] {
        const walls: Wall[] = [];
        for (let i = 0; i < count; i++) {
            cfg.VERBOSE > 2 && console.log('wall - gen Walls:', i);
            let wall: Wall;
            do {
                wall = Wall.createWall(rng);
            } while (!Wall.isWallPositionValid(wall, walls, nodes, chain));
            walls.push(wall);
        }
        cfg.VERBOSE > 0 && console.log(`Generated ${walls.length} walls`);
        return walls;
    }

    /**
     * Creates a single wall at a random position with a random orientation.
     * The wall's length is determined by the configuration's wallMaxLength.
     * 
     * @param rng - A random number generator function
     * @returns A new Wall instance with random position and orientation
     */
    static createWall(rng: () => number): Wall {
        cfg.VERBOSE > 2 && console.log('wall - create Wall');
        const length =
            rng() * (cfg.wallMaxLength * 0.3) + cfg.wallMaxLength * 0.1;
        const angle = rng() * Math.PI * 2;
        const x1 = rng() * cfg.width;
        const y1 = rng() * cfg.height;
        const x2 = x1 + length * Math.cos(angle);
        const y2 = y1 + length * Math.sin(angle);
        return new Wall(x1, y1, x2, y2);
    }

    /**
     * Checks if a wall can be placed at the specified position without causing conflicts.
     * A wall position is invalid if it:
     * - Is too close to any node
     * - Intersects with any existing walls
     * - Blocks the main node chain
     * 
     * @param wall - The wall to validate
     * @param walls - Array of existing walls to check against
     * @param nodes - Array of all nodes in the game
     * @param chain - The main chain of nodes that should not be blocked
     * @returns True if the wall position is valid, false otherwise
     */
    static isWallPositionValid(wall: Wall, walls: Wall[], nodes: Node[], chain: Node[]): boolean {
        cfg.VERBOSE > 2 && console.log('wall - is Wall Pos Valid');
        
        // Check minimum distance from nodes
        for (const node of nodes) {
            const dist = this.distanceFromPointToLine(
                node.x, node.y, wall.x1, wall.y1, wall.x2, wall.y2
            );
            if (dist < cfg.nodeRadius + 5) {
                return false;
            }
        }

        // Check minimum distance from other walls
        //for (const otherWall of walls) {
        //    if (this.doLinesIntersect(
        //        wall.x1, wall.y1, wall.x2, wall.y2,
        //        otherWall.x1, otherWall.y1, otherWall.x2, otherWall.y2
        //    )) {
        //        return false;
        //    }
        //}

        // Check that the wall doesn't block the chain
        for (let i = 0; i < chain.length - 1; i++) {
            const node1 = chain[i];
            const node2 = chain[i + 1];
            if (this.doLinesIntersect(
                node1.x, node1.y, node2.x, node2.y,
                wall.x1, wall.y1, wall.x2, wall.y2
            )) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculates the shortest distance from a point to a line segment.
     * 
     * @param px - The x-coordinate of the point
     * @param py - The y-coordinate of the point
     * @param x1 - The x-coordinate of the line's start point
     * @param y1 - The y-coordinate of the line's start point
     * @param x2 - The x-coordinate of the line's end point
     * @param y2 - The y-coordinate of the line's end point
     * @returns The shortest distance from the point to the line segment
     */
    private static distanceFromPointToLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Determines if two line segments intersect.
     * 
     * @param x1 - The x-coordinate of the first line's start point
     * @param y1 - The y-coordinate of the first line's start point
     * @param x2 - The x-coordinate of the first line's end point
     * @param y2 - The y-coordinate of the first line's end point
     * @param x3 - The x-coordinate of the second line's start point
     * @param y3 - The y-coordinate of the second line's start point
     * @param x4 - The x-coordinate of the second line's end point
     * @param y4 - The y-coordinate of the second line's end point
     * @returns True if the line segments intersect, false otherwise
     */
    private static doLinesIntersect(
        x1: number, y1: number, x2: number, y2: number,
        x3: number, y3: number, x4: number, y4: number
    ): boolean {
        const denom = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
        if (denom === 0) return false; // Lines are parallel

        const ua = (((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3))) / denom;
        const ub = (((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3))) / denom;

        return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1);
    }
}
