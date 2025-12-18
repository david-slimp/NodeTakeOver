import {Game} from '../src/game.ts';
import {Node} from '../src/node.ts';
import {Wall} from '../src/wall.ts';

function createMockContext() {
    const calls = {
        lineTo: [],
        moveTo: [],
        arc: [],
    };

    const ctx = {
        canvas: {},
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 0,
        font: '',
        textAlign: 'center',
        textBaseline: 'middle',
        beginPath: () => {},
        clearRect: () => {},
        fillRect: () => {},
        fillText: () => {},
        stroke: () => {},
        fill: () => {},
        save: () => {},
        restore: () => {},
        arc: (x, y, r, sAngle, eAngle) => {
            calls.arc.push([x, y, r, sAngle, eAngle]);
        },
        moveTo: (x, y) => {
            calls.moveTo.push([x, y]);
        },
        lineTo: (x, y) => {
            calls.lineTo.push([x, y]);
        },
        setTransform: () => {},
        measureText: () => ({width: 0}),
    };

    return {ctx, calls};
}

function createMockCanvas(ctx) {
    return {
        width: 300,
        height: 300,
        getContext: () => ctx,
        addEventListener: () => {},
        removeEventListener: () => {},
        getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 300,
            height: 300,
        }),
    };
}

describe('Aim line (LoS) helper', () => {
    test('snaps aim endpoint to node center when near a node', () => {
        const {ctx} = createMockContext();
        const canvas = createMockCanvas(ctx);
        const game = new Game(canvas, 123, false, {skipUIRenderer: true});

        const playerNode = new Node(100, 100, 50, '#905090', 'player', 30);
        const targetNode = new Node(200, 100, 20, '#95a5a6', null, 30);
        game.nodes = [playerNode, targetNode];
        game.walls = [];

        game.handlePointerDown({clientX: 100, clientY: 100});
        game.handlePointerMove({clientX: 234, clientY: 100});
        expect(game.aimPoint).toEqual({x: 200, y: 100});

        game.handlePointerMove({clientX: 236, clientY: 100});
        expect(game.aimPoint).toEqual({x: 236, y: 100});
    });

    test('draws aim line to first wall intersection when blocked', () => {
        const {ctx, calls} = createMockContext();
        const canvas = createMockCanvas(ctx);
        const game = new Game(canvas, 123, false, {skipUIRenderer: true});

        const playerNode = new Node(100, 100, 50, '#905090', 'player', 30);
        game.nodes = [playerNode];
        game.walls = [new Wall(150, 50, 150, 150)];

        game.handlePointerDown({clientX: 100, clientY: 100});
        game.handlePointerMove({clientX: 250, clientY: 100});
        game.draw();

        const lastLineTo = calls.lineTo[calls.lineTo.length - 1];
        expect(lastLineTo).toEqual([150, 100]);
    });
});
