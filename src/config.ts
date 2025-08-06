import { GameConfig, SeededRandomGenerator } from './types/config';

/**
 * Main game configuration object with default values.
 * Contains all the game parameters and settings.
 */
export const cfg: GameConfig = {
    // Debug and version
    VERBOSE: 1, // 0=off 1=normal 2=debug
    VERSION: '0.3.1',

    // Game constants
    GAME_SPEED: 1, // 1=normal 2=faster
    width: 800,
    height: 600,
    seed: 1234,

    // Node configuration
    TOTAL_NODES: 15, // maybe only 10 for phone?
    MIN_DISTANCE: 70, // Minimum distance between nodes
    nodeRadius: 30,
    UNIT_DISPATCH_FREQUENCY: 10, // generally 1-10 (1=1/10sec  10=10/10sec)

    // Wall configuration
    WALL_COUNT: 80, // reset based on screen size
    wallMaxLength: 10, // reset based on screen size
    WALL_COLOR: '#555',
    WALL_WIDTH: 5,

    // Player configuration
    MAX_UNITS: 100, // max units for player / computer initial node
    PLAYER_START_UNITS: 50,
    PLAYER_COLOR: '#905090',
    PLAYER_UNIT_GENERATION_SPEED: 6, // Units generated per second for player
    PLAYER_UNIT_SPEED: 50, // Speed at which player's units travel
    PLAYER_UNIT_DISPATCH_SPEED: 6, // Units dispatched per second for player

    // Computer configuration
    COMPUTER_START_UNITS: 80,
    COMPUTER_COLOR: '#e74c3c',
    COMPUTER_UNIT_GENERATION_SPEED: 6, // Units generated per second for the computer
    COMPUTER_UNIT_SPEED: 50, // Speed at which computer's units travel
    COMPUTER_UNIT_DISPATCH_SPEED: 6, // Units dispatched per second for computer
    COMPUTER_DELAY_NEW_BASE: 3000, // 3 seconds in milliseconds

    // Uncontrolled nodes configuration
    UNCONTROLLED_MAX_UNITS: 0.75,
    UNCONTROLLED_START_UNITS: 20,
    UNCONTROLLED_COLOR: '#95a5a6',
    UNCONTROLLED_UNIT_GENERATION_SPEED: 3, // Uncontrolled bases generate units
};

/**
 * Creates a seeded random number generator.
 * @param {number} seed - The seed value for the random number generator.
 * @returns {SeededRandomGenerator} A function that generates random numbers based on the seed.
 */
export function seededRandomGenerator(seed: number): SeededRandomGenerator {
    let value = seed;
    const rng = (): number => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    };
    // Add the seed property to the function
    Object.defineProperty(rng, 'seed', {
        value: seed,
        writable: false,
        enumerable: false,
        configurable: false
    });
    return rng as SeededRandomGenerator;
}

/**
 * Default seeded RNG instance using the default seed from config.
 */
export const rngInstance: SeededRandomGenerator = seededRandomGenerator(cfg.seed);
