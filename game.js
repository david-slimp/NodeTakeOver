// game.js

import { cfg, rngInstance, seededRandomGenerator } from "./config.js";
import { Node } from "./node.js";
import { Wall } from "./wall.js";

export class Game {
  constructor(canvasId, seed = null) {
    this.seed = seed || Date.now();
    cfg.seed = this.seed;
    // Create a new RNG instance with the provided seed
    this.rng = seededRandomGenerator(this.seed);
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error("Canvas element not found!");
      return;
    }

    // Game variables
    this.ctx = this.canvas.getContext("2d");
    this.nodes = [];
    this.nodechain = [];
    this.walls = [];
    this.playerGold = 0;
    this.computerGold = 0;
    this.attackAnimations = [];
    this.isMuted = false;
    this.selectedNode = null;
    this.computerCanAct = false; // Tracks if the computer can act, start off with little delay
    this.computerLastCaptureTime = Date.now(); // Tracks the last capture time
    this.unitGenerationInterval = null;
    this.continuousFlowInterval = null;
    this.gameLoopId;

    // final setup
    this.setGameboardDimensions();
    console.log("INITGAME - A");
  }

  destroy() {
    cancelAnimationFrame(this.gameLoopId);
    clearInterval(this.unitGenerationInterval);
    // Add any other cleanup necessary
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
    console.log("Canvas Width:", this.canvas.width);
    console.log("Canvas Height:", this.canvas.height);

    // Now that we have the screen size we can adjust the wallMaxLength based on that
    cfg.wallMaxLength = Math.min(cfg.width, cfg.height) * 0.4;

    cfg.UNIT_DISPATCH_FREQUENCY = 5;
    cfg.PLAYER_UNIT_SPEED = 10;
  }

  start() {
    console.log("INITGAME - B");
    this.initGame();
    this.gameLoop();
  }

  // Initialize the game
  initGame() {
    cfg.VERBOSE >= 2 && console.log("starting initGame");
    // Clear previous intervals
    clearInterval(this.unitGenerationInterval);
    clearInterval(this.continuousFlowInterval);
    cancelAnimationFrame(this.gameLoopId);
    this.isPaused = false;
    this.gameActive = true; // Tracks if the game is active

    // SET UP Nodes
    this.nodes = this.initializeBoard(cfg.TOTAL_NODES);
    this.initializeControlledNodes();

    // SET UP Node Chain
    this.nodechain = Node.createNodeChain(this.nodes);
    Node.drawNodeChain(this.ctx, this.nodes);

    // SET UP Walls
    this.walls = Wall.generateWalls(cfg.WALL_COUNT, this.nodes, this.nodechain, this.rng);
    this.setupEventListeners();
    this.continuousFlowInterval = setInterval(
      () => this.handleContinuousFlow(),
      100 * cfg.UNIT_DISPATCH_FREQUENCY
    );

    // Initialize mute button (OLD CODE)
    // updateMuteButton();
    // document.getElementById("muteButton").addEventListener("click", toggleMute);

    cfg.VERBOSE >= 2 && console.log("Game initialized");

    console.log("BEFORE GAMELOOP");
    this.startGameLoop();
    console.log("AFTER GAMELOOP");
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
        cfg.nodeRadius
      );
      if (this.isNodePositionValid(newNode, nodes)) {
        nodes.push(newNode);
      }
    }
    console.log("Total number of nodes created:", nodes.length);
    return nodes;
  }

  initializeControlledNodes() {
    this.playerNode = this.initializeRandomNode(
      cfg.PLAYER_COLOR,
      cfg.PLAYER_START_UNITS
    );
    this.computerNode = this.initializeRandomNode(
      cfg.COMPUTER_COLOR,
      cfg.COMPUTER_START_UNITS,
      this.playerNode
    );
    this.initializeUncontrolledNodes(this.playerNode, this.computerNode);
  }

  initializeRandomNode(color, units, avoidNode = null) {
    console.log("initRand:", color);
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
      node.owner = color === cfg.PLAYER_COLOR ? "player" : "computer";
      return node;
    } else {
      console.error("Could not find a valid node to initialize");
      return null; // Return null if no valid node is found
    }
  }

  initializeUncontrolledNodes(avoidNode1, avoidNode2) {
    this.nodes.forEach((node) => {
      if (node !== avoidNode1 && node !== avoidNode2) {
        node.units = cfg.UNCONTROLLED_START_UNITS;
        node.color = cfg.UNCONTROLLED_COLOR;
        node.owner = null;
        node.maxUnits = Math.floor(cfg.MAX_UNITS * cfg.UNCONTROLLED_MAX_UNITS);
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
          Math.pow(newNode.x - node.x, 2) + Math.pow(newNode.y - node.y, 2)
        ) >= cfg.MIN_DISTANCE
    );
  }

  linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    console.log("game - lines Inter");
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
    console.log("game - lines Inter Circle");
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
    this.canvas.removeEventListener("mousedown", this.handlePointerDown);
    this.canvas.removeEventListener("mouseup", this.handlePointerUp);
    this.canvas.removeEventListener("touchstart", this.handlePointerDown);
    this.canvas.removeEventListener("touchend", this.handlePointerUp);

    this.canvas.addEventListener("mousedown", (event) =>
      this.handlePointerDown(event)
    );
    this.canvas.addEventListener("mouseup", (event) =>
      this.handlePointerUp(event)
    );
    this.canvas.addEventListener(
      "touchstart",
      (event) => this.handlePointerDown(event),
      { passive: false }
    );
    this.canvas.addEventListener(
      "touchend",
      (event) => this.handlePointerUp(event),
      { passive: false }
    );
    document.addEventListener("keydown", (event) => this.handleKeydown(event));
  }

  handlePointerDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX || event.touches[0].clientX) - rect.left;
    const y = (event.clientY || event.touches[0].clientY) - rect.top;
    this.selectedNode = Node.getNodeAt(x, y, this.nodes);
  }

  handlePointerUp(event) {
    cfg.VERBOSE > 2 && console.log("PointerUp");
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX || event.changedTouches[0].clientX) - rect.left;
    const y = (event.clientY || event.changedTouches[0].clientY) - rect.top;
    if (this.selectedNode && this.selectedNode.owner === "player") {
      cfg.VERBOSE > 2 && console.log("PointerUp - A");
      const targetNode = Node.getNodeAt(x, y, this.nodes);
      if (
        targetNode &&
        targetNode !== this.selectedNode &&
        !this.isPathBlocked(this.selectedNode, targetNode)
      ) {
        cfg.VERBOSE > 2 && console.log("PointerUp - B");
        this.selectedNode.destination = targetNode;
      } else {
        cfg.VERBOSE > 2 && console.log("PointerUp - C");
        this.selectedNode.destination = null; // Reset destination if clicking on the same node
      }
    }
    cfg.VERBOSE > 2 && console.log("PointerUp - D");
    this.selectedNode = null;
  }

  handleKeydown(event) {
    switch (event.key.toLowerCase()) {
      case "p":
      case " ":
        this.togglePause();
        break;
      case "r":
        this.initGame();
        break;
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      clearInterval(this.unitGenerationInterval);
      clearInterval(this.continuousFlowInterval);
      cancelAnimationFrame(this.gameLoopId);
    } else {
      this.unitGenerationInterval = setInterval(
        () => this.generateUnitsForControlledNodes(),
        1000 / cfg.PLAYER_UNIT_GENERATION_SPEED
      );
      this.continuousFlowInterval = setInterval(
        () => this.handleContinuousFlow(),
        1000 / cfg.PLAYER_UNIT_DISPATCH_SPEED
      );
      this.startGameLoop();
    }
  }

  generateUnitsForControlledNodes() {
    return;
    if (!this.gameActive) return;
    console.log("generateUnitsForControlledNodes");
    this.nodes.forEach((node) => {
      if (node.units < node.maxUnits) {
        node.units += node.generationSpeed / 1000; // Divide by 10 to match units generated per second
      }
    });
  }

  startGameLoop() {
    this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
  }

  gameLoop() {
    if (this.gameActive && !this.isPaused) {
      this.updateGameState();
      this.updateAttackAnimations();
      this.draw();
      this.checkGameOver();
      this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  updateGameState() {
    // return;  // this same code is done with generateUnitsForControlledNodes
    this.nodes.forEach((node) => {
      if (node.units < node.maxUnits) {
        node.units += node.generationSpeed / 500;
      }
    });
    // Other game logic like attack animations
  }

  updateAttackAnimations() {
    return;
    this.attackAnimations.forEach((animation) => {
      animation.progress += 16 / animation.duration; // Assume 60 FPS
      if (animation.progress > 1) {
        this.resolveBattle(animation.toNode, animation.fromNode.owner);
        this.attackAnimations = this.attackAnimations.filter(
          (a) => a !== animation
        );
      }
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, cfg.width, cfg.height);
    this.walls.forEach((wall) => wall.draw(this.ctx));
    this.nodes.forEach((node) => node.draw(this.ctx));
    Node.drawNodeChain(this.ctx, this.nodes);
    this.drawAttackAnimations();
  }

  drawAttackAnimations() {
    this.attackAnimations.forEach((animation) => {
      animation.progress += 16 / animation.duration; // Assume 60 FPS
      if (animation.progress > 1) animation.progress = 1;

      const startX = animation.startX;
      const startY = animation.startY;
      const endX =
        animation.toNode.x -
        cfg.nodeRadius *
          Math.cos(
            Math.atan2(animation.toNode.y - startY, animation.toNode.x - startX)
          );
      const endY =
        animation.toNode.y -
        cfg.nodeRadius *
          Math.sin(
            Math.atan2(animation.toNode.y - startY, animation.toNode.x - startX)
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
      if (node.owner === "player" && node.destination && node.units > 1) {
        this.sendUnits(node, node.destination, cfg.PLAYER_UNIT_SPEED);
      } else if (
        node.owner === "computer" &&
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
            Math.pow(potentialTarget.y - node.y, 2)
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
    cfg.VERBOSE > 2 && console.log("game - isPathBlocked");
    return this.walls.some((wall) =>
      this.linesIntersect(
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

  linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    cfg.VERBOSE > 2 && console.log("game - lines Inter PART2");
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  // send units to target
  sendUnits(fromNode, toNode, unitSpeed) {
    const travelTime = this.calculateTravelTime(fromNode, toNode, unitSpeed);
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
    };
    this.attackAnimations.push(animation);

    setTimeout(() => {
      this.resolveBattle(toNode, fromNode.owner);
      this.attackAnimations = this.attackAnimations.filter(
        (a) => a !== animation
      );
    }, travelTime);
  }

  calculateTravelTime(fromNode, toNode, unitSpeed) {
    const distance =
      Math.sqrt(
        Math.pow(toNode.x - fromNode.x, 2) + Math.pow(toNode.y - fromNode.y, 2)
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
          attackerOwner === "player" ? cfg.PLAYER_COLOR : cfg.COMPUTER_COLOR;

        // Increase the generationSpeed and round to one decimal place
        toNode.generationSpeed =
          Math.round(toNode.generationSpeed * 10 + 3) / 10; // make sure there's only 1 place after decimal

        toNode.destination = null;
        if (attackerOwner === "computer") {
          this.computerCanAct = false;
          this.computerLastCaptureTime = Date.now();
        }
      }
    }
  }

  checkGameOver() {
    const playerNodes = this.nodes.filter((node) => node.owner === "player");
    const computerNodes = this.nodes.filter(
      (node) => node.owner === "computer"
    );

    if (playerNodes.length === 0) {
      this.computerGold += 100;
      this.displayGameOver("Computer wins!");
    } else if (computerNodes.length === 0) {
      this.playerGold += 100;
      this.displayGameOver("Congratulations! You win!");
    }
  }

  displayGameOver(message) {
    this.gameActive = false;
    document.getElementById("statusText").innerText = message;
    document.getElementById(
      "playerGold"
    ).innerText = `Player Gold: ${this.playerGold}`;
    document.getElementById(
      "computerGold"
    ).innerText = `Computer Gold: ${this.computerGold}`;
    document.getElementById("restartButton").style.display = "inline-block";
    this.attackAnimations = [];
  }
}
