export interface SeededRandomGenerator {
    (): number;
    seed: number;
}

export interface GameConfig {
    // Debug and version
    VERBOSE: number;
    VERSION: string;

    // Game constants
    GAME_SPEED: number;
    width: number;
    height: number;
    seed: number;

    // Node configuration
    TOTAL_NODES: number;
    MIN_DISTANCE: number;
    nodeRadius: number;
    UNIT_DISPATCH_FREQUENCY: number;
    UNCONTROLLED_MAX_UNITS: number;
    UNCONTROLLED_START_UNITS: number;
    UNCONTROLLED_COLOR: string;
    UNCONTROLLED_UNIT_GENERATION_SPEED: number;

    // Wall configuration
    WALL_COUNT: number;
    wallMaxLength: number;
    WALL_COLOR: string;
    WALL_WIDTH: number;

    // Player configuration
    MAX_UNITS: number;
    PLAYER_START_UNITS: number;
    PLAYER_COLOR: string;
    PLAYER_UNIT_GENERATION_SPEED: number;
    PLAYER_UNIT_SPEED: number;
    PLAYER_UNIT_DISPATCH_SPEED: number;

    // Computer configuration
    COMPUTER_START_UNITS: number;
    COMPUTER_COLOR: string;
    COMPUTER_UNIT_GENERATION_SPEED: number;
    COMPUTER_UNIT_SPEED: number;
    COMPUTER_UNIT_DISPATCH_SPEED: number;
    COMPUTER_DELAY_NEW_BASE: number;
}
