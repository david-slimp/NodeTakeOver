// game.js

import {cfg, rngInstance, seededRandomGenerator} from './config';
import {Node} from './node';
import {NodeRenderer} from './NodeRenderer';
import {Wall} from './wall';

export class Game {
    constructor(canvasId, seed = null, debugMode = false) {
        this.seed = seed || Date.now();
        cfg.seed = this.seed;
        // Create a new RNG instance with the provided seed
        this.rng = seededRandomGenerator(this.seed);
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        // Track pause state and timing
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;

        // Game variables
        this.ctx = this.canvas.getContext('2d');
        this.nodeRenderer = new NodeRenderer(this.ctx);
        this.config = {};
        this.attackAnimations = []; // Track active attack animations
        this.activeTimeouts = []; // Track active timeouts for cleanup
        this.nodes = [];
        this.nodechain = [];
        this.walls = [];
        this.playerGold = 0;
        this.computerGold = 0;
        this.attackAnimations = [];
        this.isMuted = false;
        this.isPaused = false; // Track if game is paused
        this.gameActive = false; // Track if game is active
        this.selectedNode = null;
        this.computerCanAct = false; // Tracks if the computer can act, start off with little delay
        this.computerLastCaptureTime = Date.now(); // Tracks the last capture time
        this.gameLoopId = null;
        
        // Initialize bound event handlers
        this.boundHandlePointerDown = null;
        this.boundHandlePointerUp = null;
        this.boundHandleKeydown = null;
        
        // Delta time tracking
        this.lastFrameTime = 0;
        this.continuousFlowTimer = 0;
        this.unitGenerationTimer = 0;
        
        // Debug mode flag - passed from main.js to persist across restarts
        this.debugMode = debugMode;

        // final setup
        this.setGameboardDimensions();
        console.log('INITGAME - A');
    }

    destroy() {
        console.log('Destroying game instance...');
        
        // Mark game as inactive to prevent any further updates
        this.gameActive = false;
        this.isPaused = true;
        
        // Clear any active timeouts first
        this.clearActiveTimeouts();
        
        // Cancel any pending animation frames
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        // Clean up event listeners
        if (this.boundHandleKeydown) {
            document.removeEventListener('keydown', this.boundHandleKeydown);
            this.boundHandleKeydown = null;
        }
        
        // Remove all pointer event listeners
        if (this.boundHandlePointerDown) {
            this.canvas.removeEventListener('mousedown', this.boundHandlePointerDown);
            this.canvas.removeEventListener('touchstart', this.boundHandlePointerDown);
            this.boundHandlePointerDown = null;
        }
        if (this.boundHandlePointerUp) {
            this.canvas.removeEventListener('mouseup', this.boundHandlePointerUp);
            this.canvas.removeEventListener('touchend', this.boundHandlePointerUp);
            this.boundHandlePointerUp = null;
        }
        
        // Clear references to DOM elements
        this.selectedNode = null;
        
        // Clear any active animations
        this.attackAnimations = [];
        
        // Clear the canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Force garbage collection (where supported)
        if (window.gc) {
            window.gc();
        }
        
        console.log('Game instance destroyed and resources cleaned up');
    }

    setGameboardDimensions() {
        if (window.innerWidth < 600) {
            cfg.width = window.innerWidth - 20;
            cfg.height = window.innerHeight - 100;
            cfg.nodeRadius = 20;
            cfg.WALL_COUNT = 12;
        } else {
            cfg.width = 800;
            cfg.height = 600;
            cfg.nodeRadius = 30;
            cfg.WALL_COUNT = 52;
        }
        this.canvas.width = cfg.width;
        this.canvas.height = cfg.height;
        console.log('Canvas Width:', this.canvas.width);
        console.log('Canvas Height:', this.canvas.height);

        // Now that we have the screen size we can adjust the wallMaxLength based on that
        cfg.wallMaxLength = Math.min(cfg.width, cfg.height) * 0.4;

        cfg.UNIT_DISPATCH_FREQUENCY = 5;
        cfg.PLAYER_UNIT_SPEED = 10;
    }

    start() {
        console.log('INITGAME - B');
        this.initGame();
        // Reset timers
        this.lastFrameTime = 0;
        this.continuousFlowTimer = 0;
        this.unitGenerationTimer = 0;
        this.startGameLoop();
    }

    // Initialize the game
    initGame() {
        cfg.VERBOSE >= 2 && console.log('starting initGame');
        // Clear any existing game loop
        cancelAnimationFrame(this.gameLoopId);
        this.isPaused = false;
        this.gameActive = true; // Tracks if the game is active

        // SET UP Nodes
        this.nodes = this.initializeBoard(cfg.TOTAL_NODES);
        this.initializeControlledNodes();

        // SET UP Node Chain
        this.nodechain = Node.createNodeChain(this.nodes);
        this.nodeRenderer.drawNodeChain(this.nodes);

        // SET UP Walls
        this.walls = Wall.generateWalls(
            cfg.WALL_COUNT,
            this.nodes,
            this.nodechain,
            this.rng,
        );
        // Set up event listeners
        this.setupEventListeners();
        
        // Reset timers
        this.continuousFlowTimer = 0;
        this.unitGenerationTimer = 0;
        this.lastFrameTime = performance.now();

        // Clear any existing intervals (for safety)
        if (this.continuousFlowInterval) {
            clearInterval(this.continuousFlowInterval);
            this.continuousFlowInterval = null;
        }

        // Initialize mute button (OLD CODE)
        // updateMuteButton();
        // document.getElementById("muteButton").addEventListener("click", toggleMute);

        cfg.VERBOSE >= 2 && console.log('Game initialized');
        console.log('BEFORE GAMELOOP');
        this.startGameLoop();
        console.log('AFTER GAMELOOP');
    }

    initializeBoard(totalNodes) {
        const nodes = [];
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
        console.log('Total number of nodes created:', nodes.length);
        return nodes;
    }

    initializeControlledNodes() {
        this.playerNode = this.initializeRandomNode(
            cfg.PLAYER_COLOR,
            cfg.PLAYER_START_UNITS,
        );
        this.computerNode = this.initializeRandomNode(
            cfg.COMPUTER_COLOR,
            cfg.COMPUTER_START_UNITS,
            this.playerNode,
        );
        this.initializeUncontrolledNodes(this.playerNode, this.computerNode);
    }

    initializeRandomNode(color, units, avoidNode = null) {
        console.log('initRand:', color);
        let node = null;
        let attempts = 0;
        const maxAttempts = 100; // Limit attempts to prevent infinite loops

        do {
            node = this.randomNode(this.nodes);
            attempts++;
        } while (
            attempts < maxAttempts &&
            avoidNode &&
            node &&
            this.distanceBetweenNodes(node, avoidNode) < 100
        );

        if (node) {
            node.units = units;
            node.color = color;
            node.owner = color === cfg.PLAYER_COLOR ? 'player' : 'computer';
            return node;
        } else {
            console.error('Could not find a valid node to initialize');
            return null; // Return null if no valid node is found
        }
    }

    initializeUncontrolledNodes(avoidNode1, avoidNode2) {
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

    randomNode(nodes) {
        return nodes[Math.floor(this.rng() * nodes.length)];
    }

    distanceBetweenNodes(node1, node2) {
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    isNodePositionValid(newNode, nodes) {
        return nodes.every(
            (node) =>
                Math.sqrt(
                    Math.pow(newNode.x - node.x, 2) +
                        Math.pow(newNode.y - node.y, 2),
                ) >= cfg.MIN_DISTANCE,
        );
    }

    linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        console.log('game - lines Inter');
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (denom === 0) return false;
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
        console.log('game - lines Inter Circle');
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

    setupEventListeners() {
        // Remove existing event listeners if they exist
        if (this.boundHandlePointerDown) {
            this.canvas.removeEventListener('mousedown', this.boundHandlePointerDown);
            this.canvas.removeEventListener('touchstart', this.boundHandlePointerDown);
        }
        if (this.boundHandlePointerUp) {
            this.canvas.removeEventListener('mouseup', this.boundHandlePointerUp);
            this.canvas.removeEventListener('touchend', this.boundHandlePointerUp);
        }
        if (this.boundHandleKeydown) {
            document.removeEventListener('keydown', this.boundHandleKeydown);
        }

        // Bind methods to maintain 'this' context
        this.boundHandlePointerDown = this.handlePointerDown.bind(this);
        this.boundHandlePointerUp = this.handlePointerUp.bind(this);
        this.boundHandleKeydown = this.handleKeydown.bind(this);

        // Add event listeners
        this.canvas.addEventListener('mousedown', this.boundHandlePointerDown);
        this.canvas.addEventListener('mouseup', this.boundHandlePointerUp);
        this.canvas.addEventListener(
            'touchstart',
            this.boundHandlePointerDown,
            { passive: false }
        );
        this.canvas.addEventListener(
            'touchend',
            this.boundHandlePointerUp,
            { passive: false }
        );
        document.addEventListener('keydown', this.boundHandleKeydown);
    }

    handlePointerDown(event) {
        // Don't process pointer events when paused
        if (this.isPaused) {
            event.preventDefault();
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX || event.touches[0].clientX) - rect.left;
        const y = (event.clientY || event.touches[0].clientY) - rect.top;
        this.selectedNode = Node.getNodeAt(x, y, this.nodes);
    }

    handlePointerUp(event) {
        // Don't process pointer events when paused
        if (this.isPaused) {
            event.preventDefault();
            return;
        }
            
        cfg.VERBOSE > 2 && console.log('PointerUp - A:', event);
        if (this.selectedNode) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (event.clientX || event.changedTouches[0].clientX) - rect.left;
            const y = (event.clientY || event.changedTouches[0].clientY) - rect.top;
            const targetNode = Node.getNodeAt(x, y, this.nodes);
            
            if (
                targetNode &&
                targetNode !== this.selectedNode &&
                !this.isPathBlocked(this.selectedNode, targetNode)
            ) {
                cfg.VERBOSE > 2 && console.log('PointerUp - B');
                this.selectedNode.destination = targetNode;
            } else {
                cfg.VERBOSE > 2 && console.log('PointerUp - C');
                this.selectedNode.destination = null; // Reset destination if clicking on the same node
            }
        }
        cfg.VERBOSE > 2 && console.log('PointerUp - D');
    }

    handleKeydown(event) {
        // Always allow pause/unpause with 'p' or spacebar
        if (event.key.toLowerCase() === 'p' || event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault();
            this.togglePause();
            return;
        }

        // Block all other inputs when paused
        if (this.isPaused) {
            event.preventDefault();
            return;
        }

        // Toggle debug mode with '?'
        if (event.key === '?') {
            event.preventDefault();
            this.debugMode = !this.debugMode;
            console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
            return;
        }

        // Handle other keys when not paused
        switch (event.key.toLowerCase()) {
            case 'r':
                this.initGame();
                break;
            // Add other key handlers here if needed
        }
    }

    handlePointerDown(event) {
        // Don't process pointer events when paused
        if (this.isPaused) {
            event.preventDefault();
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX || event.touches[0].clientX) - rect.left;
        const y = (event.clientY || event.touches[0].clientY) - rect.top;
        this.selectedNode = Node.getNodeAt(x, y, this.nodes);
    }
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            // When pausing, record the pause start time
            this.pauseStartTime = performance.now();
        } else {
            // When unpausing, update the total paused time and reset the last frame time
            this.totalPausedTime += performance.now() - this.pauseStartTime;
            this.lastFrameTime = performance.now();
            
            // Adjust animation start times to account for the pause duration
            const currentTime = performance.now();
            this.attackAnimations.forEach(anim => {
                // Extend the animation duration by the time spent paused
                if (!anim.completed) {
                    anim.startTime += (currentTime - this.pauseStartTime);
                }
            });
        }
    }
    
    clearActiveTimeouts() {
        // Clear all active timeouts when pausing
        this.activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.activeTimeouts = [];
    }

    generateUnitsForControlledNodes() {
        return;
        if (!this.gameActive) return;
        console.log('generateUnitsForControlledNodes');
        this.nodes.forEach((node) => {
            if (node.units < node.maxUnits) {
                node.units += node.generationSpeed / 1000; // Divide by 10 to match units generated per second
            }
        });
    }

    startGameLoop() {
        this.lastFrameTime = performance.now();
        this.gameLoopId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    gameLoop(timestamp) {
        // If game is no longer active, don't schedule another frame
        if (!this.gameActive) {
            console.log('Game loop ending (game no longer active)');
            return;
        }

        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const deltaTime = (timestamp - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = timestamp;

        if (this.gameActive && !this.isPaused) {
            this.updateGameState(deltaTime);
            this.updateAttackAnimations(deltaTime);
            this.checkGameOver();
        }
        
        // Always draw, even when paused, to show the pause overlay
        this.draw();
        
        // Only request next frame if game is still active
        if (this.gameActive) {
            this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }

    updateGameState(deltaTime) {
        // Update unit generation using delta time
        this.unitGenerationTimer += deltaTime;
        const generationInterval = 1 / 30; // 30 times per second
        
        while (this.unitGenerationTimer >= generationInterval) {
            this.nodes.forEach((node) => {
                if (node.units < node.maxUnits) {
                    node.units += node.generationSpeed * generationInterval;
                }
            });
            this.unitGenerationTimer -= generationInterval;
        }
        
        // Update continuous flow using delta time
        this.continuousFlowTimer += deltaTime;
        const dispatchInterval = 1 / cfg.PLAYER_UNIT_DISPATCH_SPEED;
        
        while (this.continuousFlowTimer >= dispatchInterval) {
            this.handleContinuousFlow();
            this.continuousFlowTimer -= dispatchInterval;
        }
    }

    updateAttackAnimations(deltaTime) {
        const now = performance.now();
        const activeAnimations = [];
        
        this.attackAnimations.forEach((animation) => {
            if (animation.completed) return;
            
            if (!this.isPaused) {
                // Adjust for any time spent paused
                const adjustedNow = now - this.totalPausedTime;
                const elapsed = adjustedNow - (animation.startTime - this.totalPausedTime);
                animation.progress = Math.min(elapsed / animation.duration, 1);
                
                // If animation completed, resolve battle
                if (animation.progress >= 1) {
                    this.resolveBattle(animation.toNode, animation.fromNode.owner);
                    animation.completed = true;
                    return; // Skip adding to active animations
                }
            }
            activeAnimations.push(animation);
        });
        
        // Update the animations array to only include active animations
        this.attackAnimations = activeAnimations;
    }

    draw() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the game board background
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw node connections in debug mode
        if (this.debugMode) {
            this.nodeRenderer.drawNodeChain(this.nodes);
        }
        
        // Draw walls
        this.walls.forEach(wall => wall.draw(this.ctx));
        
        // Draw nodes
        this.nodes.forEach(node => this.nodeRenderer.drawNode(node));
        
        // Draw attack animations
        this.drawAttackAnimations();
        
        // Draw selection indicator if a node is selected
        if (this.selectedNode) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(
                this.selectedNode.x,
                this.selectedNode.y,
                this.selectedNode.radius + 5,
                0,
                Math.PI * 2
            );
            this.ctx.stroke();
        }
        
        // Draw pause overlay if game is paused
        if (this.isPaused) {
            // Semi-transparent overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // "Paused" text
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
            
            // Instructions
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press P or SPACE to resume', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }

    drawAttackAnimations() {
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

    // Logic for unit dispatch
    handleContinuousFlow() {
        if (!this.gameActive) return;

        // Handle computer delay
        if (
            Date.now() - this.computerLastCaptureTime >=
            cfg.COMPUTER_DELAY_NEW_BASE
        ) {
            this.computerCanAct = true;
        }

        this.nodes.forEach((node) => {
            if (node.owner === 'player' && node.destination && node.units > 1) {
                this.sendUnits(node, node.destination, cfg.PLAYER_UNIT_SPEED);
            } else if (
                node.owner === 'computer' &&
                this.computerCanAct &&
                node.units > 10
            ) {
                const targetNode = this.findTargetNode(node);
                if (targetNode && !this.isPathBlocked(node, targetNode)) {
                    node.destination = targetNode;
                    this.sendUnits(node, targetNode, cfg.COMPUTER_UNIT_SPEED);
                }
            }
        });
    }

    // find target for computer
    findTargetNode(node) {
        let nearestEnemy = null;
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

    // check to see if path is blocked
    isPathBlocked(node1, node2) {
        cfg.VERBOSE > 2 && console.log('game - isPathBlocked');
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

    linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        cfg.VERBOSE > 2 && console.log('game - lines Inter PART2');
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (denom === 0) return false;
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    // send units to target
    sendUnits(fromNode, toNode, unitSpeed) {
        const travelTime = this.calculateTravelTime(
            fromNode,
            toNode,
            unitSpeed,
        );
        fromNode.units -= 1;

        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const startX = fromNode.x + cfg.nodeRadius * Math.cos(angle);
        const startY = fromNode.y + cfg.nodeRadius * Math.sin(angle);

        const animation = {
            fromNode,
            toNode,
            units: 1,
            color: fromNode.color,
            startX,
            startY,
            progress: 0,
            duration: travelTime,
            startTime: performance.now(),
            completed: false
        };
        this.attackAnimations.push(animation);
    }

    calculateTravelTime(fromNode, toNode, unitSpeed) {
        const distance =
            Math.sqrt(
                Math.pow(toNode.x - fromNode.x, 2) +
                    Math.pow(toNode.y - fromNode.y, 2),
            ) -
            cfg.nodeRadius * 2;
        return (distance / unitSpeed) * 100;
    }

    resolveBattle(toNode, attackerOwner) {
        if (toNode.owner === attackerOwner) {
            toNode.units = Math.min(toNode.units + 1, toNode.maxUnits);
        } else {
            toNode.units -= 1;
            if (toNode.units <= 0) {
                toNode.units = 0;
                toNode.owner = attackerOwner;
                toNode.color =
                    attackerOwner === 'player'
                        ? cfg.PLAYER_COLOR
                        : cfg.COMPUTER_COLOR;

                // Increase the generationSpeed and round to one decimal place
                toNode.generationSpeed =
                    Math.round(toNode.generationSpeed * 10 + 3) / 10; // make sure there's only 1 place after decimal

                toNode.destination = null;
                if (attackerOwner === 'computer') {
                    this.computerCanAct = false;
                    this.computerLastCaptureTime = Date.now();
                }
            }
        }
    }

    checkGameOver() {
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

    displayGameOver(message) {
        this.gameActive = false;
        document.getElementById('statusText').innerText = message;
        document.getElementById('playerGold').innerText =
            `Player Gold: ${this.playerGold}`;
        document.getElementById('computerGold').innerText =
            `Computer Gold: ${this.computerGold}`;
        document.getElementById('restartButton').style.display = 'inline-block';
        this.attackAnimations = [];
    }
}
