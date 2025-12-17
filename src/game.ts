import {cfg, seededRandomGenerator} from './config';
import {UIRenderer} from './UIRenderer';
import {Node} from './node';
import {NodeRenderer} from './NodeRenderer';
import {Wall} from './wall';
import type {SeededRandomGenerator} from './types/config';
import type {NodeOwner} from './node';

type CanvasLike = {
    width: number;
    height: number;
    getContext: (contextId: '2d') => CanvasRenderingContext2D | null;
    addEventListener: (...args: any[]) => void;
    removeEventListener: (...args: any[]) => void;
    getBoundingClientRect: () => {left: number; top: number};
};

type PointerLikeEvent = MouseEvent | TouchEvent;

interface GameOptions {
    uiRenderer?: InstanceType<typeof UIRenderer>;
    skipUIRenderer?: boolean;
}

interface AttackAnimation {
    fromNode: Node;
    toNode: Node;
    units: number;
    color: string;
    startX: number;
    startY: number;
    progress: number;
    duration: number;
    startTime: number;
    completed: boolean;
}

export class Game {
    seed: number;
    rng: SeededRandomGenerator;

    canvas: CanvasLike;
    ctx: CanvasRenderingContext2D;

    nodeRenderer: NodeRenderer;
    uiRenderer: InstanceType<typeof UIRenderer>;
    skipUIRenderer: boolean;

    pauseStartTime: number;
    totalPausedTime: number;

    attackAnimations: AttackAnimation[];
    activeTimeouts: number[];

    nodes: Node[];
    nodechain: Node[];
    walls: Wall[];

    playerGold: number;
    computerGold: number;

    isMuted: boolean;
    isPaused: boolean;
    gameActive: boolean;

    selectedNode: Node | null;
    playerNode: Node | null;
    computerNode: Node | null;

    computerCanAct: boolean;
    computerLastCaptureTime: number;

    gameLoopId: number | null;

    boundHandlePointerDown: ((event: PointerLikeEvent) => void) | null;
    boundHandlePointerUp: ((event: PointerLikeEvent) => void) | null;
    boundHandleKeydown: ((event: KeyboardEvent) => void) | null;
    boundHandleResize: (() => void) | null;

    lastFrameTime: number;
    unitGenerationTimer: number;

    debugMode: boolean;

    constructor(
        canvasId: string | CanvasLike | null,
        seed: number | null = null,
        debugMode = false,
        options: GameOptions = {},
    ) {
        this.seed = seed ?? Date.now();
        cfg.seed = this.seed;
        this.rng = seededRandomGenerator(this.seed);

        if (typeof canvasId === 'string') {
            const el = document.getElementById(canvasId);
            if (el && typeof (el as any).getContext === 'function') {
                this.canvas = el as unknown as CanvasLike;
            } else {
                console.error('Canvas element not found or is not canvas-like');
                this.canvas = document.createElement(
                    'canvas',
                ) as unknown as CanvasLike;
            }
        } else if (
            canvasId &&
            typeof (canvasId as any).getContext === 'function'
        ) {
            this.canvas = canvasId;
        } else {
            console.error(
                'Canvas not provided; using fallback canvas for non-DOM use',
            );
            this.canvas = document.createElement(
                'canvas',
            ) as unknown as CanvasLike;
        }

        this.pauseStartTime = 0;
        this.totalPausedTime = 0;

        const ctx =
            this.canvas.getContext('2d') || this.createFallbackContext();
        this.ctx = ctx;

        this.nodeRenderer = new NodeRenderer(this.ctx);

        this.uiRenderer = options.uiRenderer || new UIRenderer();
        this.skipUIRenderer = options.skipUIRenderer || false;

        this.attackAnimations = [];
        this.activeTimeouts = [];

        this.nodes = [];
        this.nodechain = [];
        this.walls = [];

        this.playerGold = 0;
        this.computerGold = 0;

        this.isMuted = false;
        this.isPaused = false;
        this.gameActive = false;

        this.selectedNode = null;
        this.playerNode = null;
        this.computerNode = null;

        this.computerCanAct = false;
        this.computerLastCaptureTime = Date.now();

        this.gameLoopId = null;

        this.boundHandlePointerDown = null;
        this.boundHandlePointerUp = null;
        this.boundHandleKeydown = null;
        this.boundHandleResize = null;

        this.lastFrameTime = 0;
        this.unitGenerationTimer = 0;

        this.debugMode = debugMode;

        this.setGameboardDimensions();
    }

    private createFallbackContext(): CanvasRenderingContext2D {
        const noop = () => {};
        return {
            canvas: this.canvas as unknown as HTMLCanvasElement,
            clearRect: noop,
            fillRect: noop,
            beginPath: noop,
            arc: noop,
            fill: noop,
            stroke: noop,
            moveTo: noop,
            lineTo: noop,
            fillText: noop,
            save: noop,
            restore: noop,
            translate: noop,
            scale: noop,
            rotate: noop,
            closePath: noop,
            measureText: () => ({width: 0}) as TextMetrics,
            getImageData: (() =>
                ({data: new Uint8ClampedArray()}) as ImageData) as any,
            putImageData: noop as any,
            createImageData: (() =>
                ({data: new Uint8ClampedArray()}) as ImageData) as any,
            setTransform: noop as any,
            drawImage: noop as any,
            font: '',
            textAlign: 'center',
            textBaseline: 'middle',
            fillStyle: '#000',
            strokeStyle: '#000',
            lineWidth: 1,
        } as unknown as CanvasRenderingContext2D;
    }

    destroy(): void {
        this.gameActive = false;
        this.isPaused = true;

        this.clearActiveTimeouts();

        if (this.gameLoopId !== null) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }

        if (this.boundHandleKeydown) {
            document.removeEventListener('keydown', this.boundHandleKeydown);
            this.boundHandleKeydown = null;
        }
        if (this.boundHandleResize) {
            window.removeEventListener('resize', this.boundHandleResize);
            this.boundHandleResize = null;
        }

        if (this.boundHandlePointerDown) {
            this.canvas.removeEventListener(
                'mousedown',
                this.boundHandlePointerDown as unknown as EventListener,
            );
            this.canvas.removeEventListener(
                'touchstart',
                this.boundHandlePointerDown as unknown as EventListener,
            );
            this.boundHandlePointerDown = null;
        }

        if (this.boundHandlePointerUp) {
            this.canvas.removeEventListener(
                'mouseup',
                this.boundHandlePointerUp as unknown as EventListener,
            );
            this.canvas.removeEventListener(
                'touchend',
                this.boundHandlePointerUp as unknown as EventListener,
            );
            this.boundHandlePointerUp = null;
        }

        this.selectedNode = null;
        this.attackAnimations = [];

        this.ctx.clearRect(0, 0, cfg.width, cfg.height);

        const maybeGc = (window as unknown as {gc?: () => void}).gc;
        if (typeof maybeGc === 'function') {
            maybeGc();
        }
    }

    setGameboardDimensions(): void {
        const canvasEl = this.canvas as unknown as HTMLCanvasElement;
        const rect = canvasEl.getBoundingClientRect?.();

        const cssWidth =
            rect && rect.width
                ? Math.floor(rect.width)
                : Math.min(1100, window.innerWidth);
        const cssHeight =
            rect && rect.height
                ? Math.floor(rect.height)
                : Math.min(820, window.innerHeight);

        cfg.width = Math.max(360, cssWidth);
        cfg.height = Math.max(360, cssHeight);
        cfg.nodeRadius = cfg.width < 680 ? 20 : 30;

        const dpr = Math.max(
            1,
            Math.floor((window.devicePixelRatio || 1) * 100) / 100,
        );
        this.canvas.width = Math.floor(cfg.width * dpr);
        this.canvas.height = Math.floor(cfg.height * dpr);

        if (typeof this.ctx.setTransform === 'function') {
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        cfg.wallMaxLength = Math.min(cfg.width, cfg.height) * 0.4;
        cfg.UNIT_DISPATCH_FREQUENCY = 5;
    }

    start(): void {
        this.setGameboardDimensions();
        if (!this.boundHandleResize) {
            this.boundHandleResize = () => this.setGameboardDimensions();
            window.addEventListener('resize', this.boundHandleResize);
        }
        this.initGame();
        this.lastFrameTime = 0;
        this.unitGenerationTimer = 0;
        this.startGameLoop();
    }

    initGame(): void {
        this.isPaused = false;
        this.gameActive = true;

        this.nodes = this.initializeBoard(cfg.TOTAL_NODES);
        this.initializeControlledNodes();

        this.nodechain = Node.createNodeChain(this.nodes);
        this.nodeRenderer.drawNodeChain(this.nodes);

        this.walls = Wall.generateWalls(
            cfg.WALL_COUNT,
            this.nodes,
            this.nodechain,
            this.rng,
        );

        this.setupEventListeners();

        this.unitGenerationTimer = 0;
        this.lastFrameTime = performance.now();
    }

    initializeBoard(totalNodes: number): Node[] {
        const nodes: Node[] = [];
        while (nodes.length < totalNodes) {
            const newNode = new Node(
                this.rng() * (cfg.width - cfg.nodeRadius * 2) + cfg.nodeRadius,
                this.rng() * (cfg.height - cfg.nodeRadius * 2) + cfg.nodeRadius,
                cfg.UNCONTROLLED_START_UNITS,
                cfg.UNCONTROLLED_COLOR,
                null,
                cfg.nodeRadius,
            );
            if (this.isNodePositionValid(newNode, nodes)) {
                nodes.push(newNode);
            }
        }
        return nodes;
    }

    initializeControlledNodes(): void {
        this.playerNode = this.initializeRandomNode(
            cfg.PLAYER_COLOR,
            cfg.PLAYER_START_UNITS,
        );
        this.computerNode = this.initializeRandomNode(
            cfg.COMPUTER_COLOR,
            cfg.COMPUTER_START_UNITS,
            this.playerNode,
        );
        if (this.playerNode && this.computerNode) {
            this.initializeUncontrolledNodes(
                this.playerNode,
                this.computerNode,
            );
        }
    }

    initializeRandomNode(
        color: string,
        units: number,
        avoidNode: Node | null = null,
    ): Node | null {
        let node: Node | null = null;
        let attempts = 0;
        const maxAttempts = 100;

        do {
            node = this.randomNode(this.nodes);
            attempts++;
        } while (
            attempts < maxAttempts &&
            avoidNode &&
            node &&
            this.distanceBetweenNodes(node, avoidNode) < 100
        );

        if (!node) return null;

        node.units = units;
        node.color = color;
        node.owner = color === cfg.PLAYER_COLOR ? 'player' : 'computer';
        return node;
    }

    initializeUncontrolledNodes(avoidNode1: Node, avoidNode2: Node): void {
        this.nodes.forEach((node) => {
            if (node !== avoidNode1 && node !== avoidNode2) {
                node.units = cfg.UNCONTROLLED_START_UNITS;
                node.color = cfg.UNCONTROLLED_COLOR;
                node.owner = null;
                node.maxUnits = Math.floor(
                    cfg.MAX_UNITS * cfg.UNCONTROLLED_MAX_UNITS,
                );
                node.generationSpeed = cfg.UNCONTROLLED_UNIT_GENERATION_SPEED;
            } else {
                node.maxUnits = cfg.MAX_UNITS;
                node.generationSpeed =
                    node.color === cfg.PLAYER_COLOR
                        ? cfg.PLAYER_UNIT_GENERATION_SPEED
                        : cfg.COMPUTER_UNIT_GENERATION_SPEED;
            }
        });
    }

    randomNode(nodes: Node[]): Node {
        return nodes[Math.floor(this.rng() * nodes.length)];
    }

    distanceBetweenNodes(node1: Node, node2: Node): number {
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    isNodePositionValid(newNode: Node, nodes: Node[]): boolean {
        return nodes.every(
            (node) =>
                Math.sqrt(
                    Math.pow(newNode.x - node.x, 2) +
                        Math.pow(newNode.y - node.y, 2),
                ) >= cfg.MIN_DISTANCE,
        );
    }

    lineIntersectsCircle(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        cx: number,
        cy: number,
        r: number,
    ): boolean {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const fx = x1 - cx;
        const fy = y1 - cy;
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - r * r;
        let discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return false;
        discriminant = Math.sqrt(discriminant);
        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    }

    setupEventListeners(): void {
        if (this.boundHandlePointerDown) {
            this.canvas.removeEventListener(
                'mousedown',
                this.boundHandlePointerDown as unknown as EventListener,
            );
            this.canvas.removeEventListener(
                'touchstart',
                this.boundHandlePointerDown as unknown as EventListener,
            );
        }
        if (this.boundHandlePointerUp) {
            this.canvas.removeEventListener(
                'mouseup',
                this.boundHandlePointerUp as unknown as EventListener,
            );
            this.canvas.removeEventListener(
                'touchend',
                this.boundHandlePointerUp as unknown as EventListener,
            );
        }
        if (this.boundHandleKeydown) {
            document.removeEventListener('keydown', this.boundHandleKeydown);
        }

        this.boundHandlePointerDown = this.handlePointerDown.bind(this);
        this.boundHandlePointerUp = this.handlePointerUp.bind(this);
        this.boundHandleKeydown = this.handleKeydown.bind(this);

        this.canvas.addEventListener(
            'mousedown',
            this.boundHandlePointerDown as unknown as EventListener,
        );
        this.canvas.addEventListener(
            'mouseup',
            this.boundHandlePointerUp as unknown as EventListener,
        );
        this.canvas.addEventListener(
            'touchstart',
            this.boundHandlePointerDown as unknown as EventListener,
            {passive: false},
        );
        this.canvas.addEventListener(
            'touchend',
            this.boundHandlePointerUp as unknown as EventListener,
            {passive: false},
        );
        document.addEventListener('keydown', this.boundHandleKeydown);
    }

    private getEventPoint(event: PointerLikeEvent): {x: number; y: number} {
        const rect = this.canvas.getBoundingClientRect();
        if ('touches' in event && event.touches.length > 0) {
            return {
                x: event.touches[0].clientX - rect.left,
                y: event.touches[0].clientY - rect.top,
            };
        }
        if ('changedTouches' in event && event.changedTouches.length > 0) {
            return {
                x: event.changedTouches[0].clientX - rect.left,
                y: event.changedTouches[0].clientY - rect.top,
            };
        }
        const mouse = event as MouseEvent;
        return {x: mouse.clientX - rect.left, y: mouse.clientY - rect.top};
    }

    handlePointerDown(event: PointerLikeEvent): void {
        if (this.isPaused) {
            event.preventDefault();
            return;
        }
        const {x, y} = this.getEventPoint(event);
        this.selectedNode = Node.getNodeAt(x, y, this.nodes) ?? null;
    }

    handlePointerUp(event: PointerLikeEvent): void {
        if (this.isPaused) {
            event.preventDefault();
            return;
        }

        if (this.selectedNode) {
            const {x, y} = this.getEventPoint(event);
            const targetNode = Node.getNodeAt(x, y, this.nodes);

            if (
                targetNode &&
                targetNode !== this.selectedNode &&
                !this.isPathBlocked(this.selectedNode, targetNode)
            ) {
                if (this.selectedNode.destination !== targetNode) {
                    this.selectedNode.dispatchTimerSeconds = 0;
                }
                this.selectedNode.destination = targetNode;
            } else {
                if (this.selectedNode.destination) {
                    this.selectedNode.dispatchTimerSeconds = 0;
                }
                this.selectedNode.destination = null;
            }
        }
    }

    handleKeydown(event: KeyboardEvent): void {
        if (event.key.toLowerCase() === 'p' || event.key === ' ') {
            event.preventDefault();
            this.togglePause();
            return;
        }

        if (this.isPaused) {
            event.preventDefault();
            return;
        }

        if (event.key === '?') {
            event.preventDefault();
            this.debugMode = !this.debugMode;
            return;
        }
    }

    togglePause(): void {
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.pauseStartTime = performance.now();
            return;
        }

        this.totalPausedTime += performance.now() - this.pauseStartTime;
        this.lastFrameTime = performance.now();

        const currentTime = performance.now();
        this.attackAnimations.forEach((anim) => {
            if (!anim.completed) {
                anim.startTime += currentTime - this.pauseStartTime;
            }
        });
    }

    clearActiveTimeouts(): void {
        this.activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
        this.activeTimeouts = [];
    }

    startGameLoop(): void {
        this.lastFrameTime = performance.now();
        this.gameLoopId = requestAnimationFrame((timestamp) =>
            this.gameLoop(timestamp),
        );
    }

    gameLoop(timestamp: number): void {
        if (!this.gameActive) return;

        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const deltaTime = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;

        if (!this.isPaused) {
            this.updateGameState(deltaTime);
            this.updateAttackAnimations(deltaTime);
            this.checkGameOver();
        }

        this.draw();

        if (this.gameActive) {
            this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }

    updateGameState(deltaTime: number): void {
        this.unitGenerationTimer += deltaTime;
        const generationInterval = 1 / 30;

        while (this.unitGenerationTimer >= generationInterval) {
            this.nodes.forEach((node) => {
                if (node.units < node.maxUnits) {
                    node.units += node.generationSpeed * generationInterval;
                }
            });
            this.unitGenerationTimer -= generationInterval;
        }
        this.handleContinuousFlow(deltaTime);
    }

    updateAttackAnimations(_deltaTime: number): void {
        const now = performance.now();
        const activeAnimations: AttackAnimation[] = [];

        this.attackAnimations.forEach((animation) => {
            if (animation.completed) return;

            if (!this.isPaused) {
                const adjustedNow = now - this.totalPausedTime;
                const elapsed =
                    adjustedNow - (animation.startTime - this.totalPausedTime);
                animation.progress = Math.min(elapsed / animation.duration, 1);

                if (animation.progress >= 1) {
                    this.resolveBattle(
                        animation.toNode,
                        animation.fromNode.owner,
                    );
                    animation.completed = true;
                    return;
                }
            }
            activeAnimations.push(animation);
        });

        this.attackAnimations = activeAnimations;
    }

    draw(): void {
        this.ctx.clearRect(0, 0, cfg.width, cfg.height);

        this.ctx.fillStyle = '#0b1020';
        this.ctx.fillRect(0, 0, cfg.width, cfg.height);

        if (this.debugMode) {
            this.nodeRenderer.drawNodeChain(this.nodes);
        }

        this.walls.forEach((wall) => wall.draw(this.ctx));
        this.nodes.forEach((node) => this.nodeRenderer.drawNode(node));
        this.drawAttackAnimations();

        if (this.selectedNode) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(
                this.selectedNode.x,
                this.selectedNode.y,
                this.selectedNode.radius + 5,
                0,
                Math.PI * 2,
            );
            this.ctx.stroke();
        }

        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, cfg.width, cfg.height);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('PAUSED', cfg.width / 2, cfg.height / 2);

            this.ctx.font = '24px Arial';
            this.ctx.fillText(
                'Press P or SPACE to resume',
                cfg.width / 2,
                cfg.height / 2 + 50,
            );
        }
    }

    drawAttackAnimations(): void {
        this.attackAnimations.forEach((animation) => {
            if (animation.completed) return;

            const startX = animation.startX;
            const startY = animation.startY;
            const endX =
                animation.toNode.x -
                cfg.nodeRadius *
                    Math.cos(
                        Math.atan2(
                            animation.toNode.y - startY,
                            animation.toNode.x - startX,
                        ),
                    );
            const endY =
                animation.toNode.y -
                cfg.nodeRadius *
                    Math.sin(
                        Math.atan2(
                            animation.toNode.y - startY,
                            animation.toNode.x - startX,
                        ),
                    );

            const currentX = startX + (endX - startX) * animation.progress;
            const currentY = startY + (endY - startY) * animation.progress;

            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(currentX, currentY);
            this.ctx.strokeStyle = animation.color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = animation.color;
            this.ctx.fill();
        });
    }

    private getDispatchSpeedMultiplier(node: Node): number {
        if (!(node.maxUnits > 0)) return 1;
        const ratio = node.units / node.maxUnits;
        if (ratio <= 0.25) return 0.9;
        if (ratio <= 0.5) return 1;
        if (ratio < 0.76) return 1.1;
        return 1.5;
    }

    handleContinuousFlow(deltaTime: number): void {
        if (!this.gameActive) return;

        if (
            Date.now() - this.computerLastCaptureTime >=
            cfg.COMPUTER_DELAY_NEW_BASE
        ) {
            this.computerCanAct = true;
        }

        this.nodes.forEach((node) => {
            if (node.owner === 'player') {
                if (!node.destination || node.units <= 1) return;
                if (!(cfg.PLAYER_UNIT_DISPATCH_SPEED > 0)) return;

                node.dispatchTimerSeconds += deltaTime;
                while (true) {
                    if (!node.destination || node.units <= 1) return;
                    const multiplier = this.getDispatchSpeedMultiplier(node);
                    const effectiveDispatchSpeed =
                        cfg.PLAYER_UNIT_DISPATCH_SPEED * multiplier;
                    if (!(effectiveDispatchSpeed > 0)) return;
                    const dispatchInterval = 1 / effectiveDispatchSpeed;
                    if (node.dispatchTimerSeconds < dispatchInterval) return;

                    this.sendUnits(
                        node,
                        node.destination,
                        cfg.PLAYER_UNIT_SPEED,
                    );
                    node.dispatchTimerSeconds -= dispatchInterval;
                }
            }

            if (node.owner === 'computer') {
                if (!this.computerCanAct || node.units <= 10) return;
                if (!(cfg.COMPUTER_UNIT_DISPATCH_SPEED > 0)) return;

                const targetNode = this.findTargetNode(node);
                if (!targetNode || this.isPathBlocked(node, targetNode)) return;
                if (node.destination !== targetNode) {
                    node.dispatchTimerSeconds = 0;
                }
                node.destination = targetNode;

                node.dispatchTimerSeconds += deltaTime;
                while (true) {
                    if (
                        !this.computerCanAct ||
                        !node.destination ||
                        node.units <= 10
                    ) {
                        return;
                    }
                    if (this.isPathBlocked(node, node.destination)) {
                        node.destination = null;
                        node.dispatchTimerSeconds = 0;
                        return;
                    }

                    const multiplier = this.getDispatchSpeedMultiplier(node);
                    const effectiveDispatchSpeed =
                        cfg.COMPUTER_UNIT_DISPATCH_SPEED * multiplier;
                    if (!(effectiveDispatchSpeed > 0)) return;
                    const dispatchInterval = 1 / effectiveDispatchSpeed;
                    if (node.dispatchTimerSeconds < dispatchInterval) return;

                    this.sendUnits(
                        node,
                        node.destination,
                        cfg.COMPUTER_UNIT_SPEED,
                    );
                    node.dispatchTimerSeconds -= dispatchInterval;
                }
            }
        });
    }

    findTargetNode(node: Node): Node | null {
        let nearestEnemy: Node | null = null;
        let minDistance = Infinity;
        this.nodes.forEach((potentialTarget) => {
            if (potentialTarget.owner !== node.owner) {
                const distance = Math.sqrt(
                    Math.pow(potentialTarget.x - node.x, 2) +
                        Math.pow(potentialTarget.y - node.y, 2),
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = potentialTarget;
                }
            }
        });
        return nearestEnemy;
    }

    isPathBlocked(node1: Node, node2: Node): boolean {
        return this.walls.some((wall) =>
            this.linesIntersect(
                wall.x1,
                wall.y1,
                wall.x2,
                wall.y2,
                node1.x,
                node1.y,
                node2.x,
                node2.y,
            ),
        );
    }

    linesIntersect(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        x3: number,
        y3: number,
        x4: number,
        y4: number,
    ): boolean {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (denom === 0) return false;
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    sendUnits(fromNode: Node, toNode: Node, unitSpeed: number): void {
        const travelTime = this.calculateTravelTime(
            fromNode,
            toNode,
            unitSpeed,
        );
        fromNode.units -= 1;

        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const startX = fromNode.x + cfg.nodeRadius * Math.cos(angle);
        const startY = fromNode.y + cfg.nodeRadius * Math.sin(angle);

        const animation: AttackAnimation = {
            fromNode,
            toNode,
            units: 1,
            color: fromNode.color,
            startX,
            startY,
            progress: 0,
            duration: travelTime,
            startTime: performance.now(),
            completed: false,
        };
        this.attackAnimations.push(animation);
    }

    calculateTravelTime(
        fromNode: Node,
        toNode: Node,
        unitSpeed: number,
    ): number {
        const distance =
            Math.sqrt(
                Math.pow(toNode.x - fromNode.x, 2) +
                    Math.pow(toNode.y - fromNode.y, 2),
            ) -
            cfg.nodeRadius * 2;
        return (distance / unitSpeed) * 100;
    }

    resolveBattle(toNode: Node, attackerOwner: NodeOwner): void {
        if (toNode.owner === attackerOwner) {
            toNode.units = Math.min(toNode.units + 1, toNode.maxUnits);
            return;
        }

        toNode.units -= 1;
        if (toNode.units > 0) return;

        toNode.units = 0;
        toNode.owner = attackerOwner;
        toNode.color =
            attackerOwner === 'player' ? cfg.PLAYER_COLOR : cfg.COMPUTER_COLOR;

        toNode.generationSpeed =
            Math.round(toNode.generationSpeed * 10 + 3) / 10;

        toNode.destination = null;
        toNode.dispatchTimerSeconds = 0;
        if (attackerOwner === 'computer') {
            this.computerCanAct = false;
            this.computerLastCaptureTime = Date.now();
        }
    }

    checkGameOver(): void {
        const playerNodes = this.nodes.filter(
            (node) => node.owner === 'player',
        );
        const computerNodes = this.nodes.filter(
            (node) => node.owner === 'computer',
        );

        if (playerNodes.length === 0) {
            this.computerGold += 100;
            this.displayGameOver('Computer wins!');
        } else if (computerNodes.length === 0) {
            this.playerGold += 100;
            this.displayGameOver('Congratulations! You win!');
        }
    }

    displayGameOver(message: string): void {
        this.gameActive = false;
        if (
            !this.skipUIRenderer &&
            this.uiRenderer &&
            typeof (this.uiRenderer as any).showGameOver === 'function'
        ) {
            const currentSeed = Number(this.seed);
            const suggestedSeed = Number.isFinite(currentSeed)
                ? currentSeed + 1
                : null;
            (this.uiRenderer as any).showGameOver(
                message,
                this.playerGold,
                this.computerGold,
                suggestedSeed,
            );
        }
        this.attackAnimations = [];
    }
}
