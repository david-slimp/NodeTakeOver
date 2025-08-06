// wall.test.js

import { Wall } from '../src/wall';
import { cfg } from '../src/config';

// Mock the config for testing
jest.mock('../src/config', () => ({
    cfg: {
        VERBOSE: 0,
        WALL_COLOR: '#000000',
        WALL_WIDTH: 2,
        wallMaxLength: 100,
        width: 800,
        height: 600,
        nodeRadius: 20
    },
    rngInstance: {
        random: () => 0.5
    }
}));

describe('Wall', () => {
    describe('constructor', () => {
        it('should create a wall with the given coordinates', () => {
            const wall = new Wall(10, 20, 30, 40);
            expect(wall.x1).toBe(10);
            expect(wall.y1).toBe(20);
            expect(wall.x2).toBe(30);
            expect(wall.y2).toBe(40);
        });
    });

    describe('draw', () => {
        it('should call the appropriate canvas methods', () => {
            const wall = new Wall(10, 20, 30, 40);
            const mockCtx = {
                beginPath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                stroke: jest.fn(),
                strokeStyle: '',
                lineWidth: 0
            };

            wall.draw(mockCtx);

            expect(mockCtx.beginPath).toHaveBeenCalled();
            expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 20);
            expect(mockCtx.lineTo).toHaveBeenCalledWith(30, 40);
            expect(mockCtx.strokeStyle).toBe('#000000');
            expect(mockCtx.lineWidth).toBe(2);
            expect(mockCtx.stroke).toHaveBeenCalled();
        });
    });

    describe('createWall', () => {
        it('should create a wall with valid coordinates', () => {
            const wall = Wall.createWall(() => 0.5);
            
            expect(wall).toBeInstanceOf(Wall);
            expect(wall.x1).toBeGreaterThanOrEqual(0);
            expect(wall.x1).toBeLessThanOrEqual(800);
            expect(wall.y1).toBeGreaterThanOrEqual(0);
            expect(wall.y1).toBeLessThanOrEqual(600);
            
            // With rng always returning 0.5, we can predict the exact values
            const expectedLength = 0.5 * (100 * 0.3) + 100 * 0.1; // 15 + 10 = 25
            const expectedAngle = 0.5 * Math.PI * 2; // π
            const expectedX1 = 0.5 * 800; // 400
            const expectedY1 = 0.5 * 600; // 300
            const expectedX2 = expectedX1 + expectedLength * Math.cos(expectedAngle);
            const expectedY2 = expectedY1 + expectedLength * Math.sin(expectedAngle);
            
            expect(wall.x1).toBeCloseTo(expectedX1);
            expect(wall.y1).toBeCloseTo(expectedY1);
            expect(wall.x2).toBeCloseTo(expectedX2);
            expect(wall.y2).toBeCloseTo(expectedY2);
        });
    });

    describe('isWallPositionValid', () => {
        it('should return true for a valid wall position', () => {
            const wall = new Wall(100, 100, 150, 150);
            const nodes = [{ x: 200, y: 200, radius: 20 }];
            const chain = [{ x: 300, y: 300 }, { x: 350, y: 350 }];
            
            const isValid = Wall.isWallPositionValid(wall, [], nodes, chain);
            expect(isValid).toBe(true);
        });

        it('should return false if wall is too close to a node', () => {
            const wall = new Wall(100, 100, 150, 150);
            const nodes = [{ x: 120, y: 120, radius: 20 }]; // Too close to the wall
            const chain = [{ x: 300, y: 300 }, { x: 350, y: 350 }];
            
            const isValid = Wall.isWallPositionValid(wall, [], nodes, chain);
            expect(isValid).toBe(false);
        });

        it('should return false if wall intersects with another wall', () => {
            const wall1 = new Wall(100, 100, 200, 200);
            const wall2 = new Wall(100, 200, 200, 100); // This will intersect with wall1
            const walls = [wall1];
            const nodes = [];
            const chain = [];
            
            const isValid = Wall.isWallPositionValid(wall2, walls, nodes, chain);
            expect(isValid).toBe(false);
        });
    });

    describe('generateWalls', () => {
        it('should generate the specified number of walls', () => {
            const nodes = [];
            const chain = [];
            const walls = Wall.generateWalls(3, nodes, chain, () => 0.5);
            
            expect(walls.length).toBe(3);
            walls.forEach(wall => {
                expect(wall).toBeInstanceOf(Wall);
            });
        });
    });
});
