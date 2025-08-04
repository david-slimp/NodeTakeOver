// wall.js

import { cfg, rngInstance } from "./config.js";

export class Wall {
  constructor(x1, y1, x2, y2) {
    cfg.VERBOSE > 2 && console.log("wall.js - constructor");
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.strokeStyle = cfg.WALL_COLOR;
    ctx.lineWidth = cfg.WALL_WIDTH;
    ctx.stroke();
  }

  static generateWalls(count, nodes, chain, rng) {
    const walls = [];
    for (let i = 0; i < count; i++) {
      cfg.VERBOSE > 2 && console.log("wall - gen Walls:", i);
      let wall;
      do {
        wall = Wall.createWall(rng);
      } while (!Wall.isWallPositionValid(wall, walls, nodes, chain));
      walls.push(wall);
    }
    return walls;
  }

  static createWall(rng) {
    cfg.VERBOSE > 2 && console.log("wall - create Wall");
    const length =
      rng() * (cfg.wallMaxLength * 0.3) + cfg.wallMaxLength * 0.1;
    const angle = rng() * Math.PI * 2;
    const x1 = rng() * cfg.width;
    const y1 = rng() * cfg.height;
    const x2 = x1 + length * Math.cos(angle);
    const y2 = y1 + length * Math.sin(angle);
    return new Wall(x1, y1, x2, y2);
  }

  static isWallPositionValid(wall, walls, nodes, chain) {
    cfg.VERBOSE > 2 && console.log("wall - is Wall Pos Valid");

    // Check if the wall intersects any existing walls
    const noWallIntersection = walls.every(
      (w) => !Wall.linesIntersect(w, wall)
    );

    // Check if the wall intersects any nodes
    const noNodeIntersection = nodes.every(
      (node) => !Wall.lineIntersectsNode(wall, node)
    );

    // Check if the wall intersects any part of the node chain
    const noChainIntersection = chain.every((node) => {
      if (node.next) {
        return !Wall.linesIntersect(
          { x1: node.x, y1: node.y, x2: node.next.x, y2: node.next.y },
          wall
        );
      }
      return true;
    });

    return noWallIntersection && noNodeIntersection && noChainIntersection;
  }

  static linesIntersect(w1, w2) {
    cfg.VERBOSE > 2 && console.log("wall - lines Inter");
    const denom =
      (w2.y2 - w2.y1) * (w1.x2 - w1.x1) - (w2.x2 - w2.x1) * (w1.y2 - w1.y1);
    if (denom === 0) return false;
    const ua =
      ((w2.x2 - w2.x1) * (w1.y1 - w2.y1) - (w2.y2 - w2.y1) * (w1.x1 - w2.x1)) /
      denom;
    const ub =
      ((w1.x2 - w1.x1) * (w1.y1 - w2.y1) - (w1.y2 - w1.y1) * (w1.x1 - w2.x1)) /
      denom;
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  static lineIntersectsNode(wall, node) {
    cfg.VERBOSE > 2 && console.log("wall - line Inter Nodes");
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const fx = wall.x1 - node.x;
    const fy = wall.y1 - node.y;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - cfg.nodeRadius * cfg.nodeRadius;
    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      return false;
    }
    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  }
}

/*

zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz


  lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      return false;
    }
    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  }



      function isPathBlocked(node1, node2) {
        return walls.some((wall) =>
          linesIntersect(
            wall.x1,
            wall.y1,
            wall.x2,
            wall.y2,
            node1.x,
            node1.y,
            node2.x,
            node2.y
          )
        );
      }


*/
