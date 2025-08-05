// wall.ts

import { cfg, rngInstance } from './config';
import type { Node } from './node';

export class Wall {
    x1: number;
    y1: number;
    x2: number;
    y2: number;

    constructor(x1: number, y1: number, x2: number, y2: number) {
        cfg.VERBOSE > 2 && console.log('wall.ts - constructor');
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.strokeStyle = cfg.WALL_COLOR;
        ctx.lineWidth = cfg.WALL_WIDTH;
        ctx.stroke();
    }

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
        return walls;
    }

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

    static isWallPositionValid(wall: Wall, walls: Wall[], nodes: Node[], chain: Node[]): boolean {
        cfg.VERBOSE > 2 && console.log('wall - is Wall Pos Valid');
        
        // Check minimum distance from nodes
        for (const node of nodes) {
            const dist = this.distanceFromPointToLine(
                node.x, node.y, wall.x1, wall.y1, wall.x2, wall.y2
            );
            if (dist < cfg.nodeRadius * 2) {
                return false;
            }
        }

        // Check minimum distance from other walls
        for (const otherWall of walls) {
            if (this.doLinesIntersect(
                wall.x1, wall.y1, wall.x2, wall.y2,
                otherWall.x1, otherWall.y1, otherWall.x2, otherWall.y2
            )) {
                return false;
            }
        }

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
