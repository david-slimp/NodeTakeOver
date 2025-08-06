// Test script to verify the config is working correctly
import { cfg, rngInstance, seededRandomGenerator } from './config.js';

// Test 1: Check if config is loaded
console.log('=== Config Test ===');
console.log('Config version:', cfg.VERSION);
console.log('Player color:', cfg.PLAYER_COLOR);
console.log('Computer color:', cfg.COMPUTER_COLOR);

// Test 2: Check RNG function
console.log('\n=== RNG Test ===');
const testRNG = seededRandomGenerator(123);
const rngValues = Array(5).fill(0).map(() => testRNG().toFixed(4));
console.log('5 RNG values with seed 123:', rngValues.join(', '));

// Test 3: Verify rngInstance is working
console.log('\n=== rngInstance Test ===');
console.log('First value from rngInstance:', rngInstance().toFixed(4));
console.log('Second value from rngInstance:', rngInstance().toFixed(4));

// Test 4: Verify required config values exist
const requiredProps = [
    'VERSION', 'GAME_SPEED', 'width', 'height', 'seed',
    'TOTAL_NODES', 'MIN_DISTANCE', 'nodeRadius',
    'PLAYER_COLOR', 'COMPUTER_COLOR', 'UNCONTROLLED_COLOR'
];

console.log('\n=== Required Properties Test ===');
const missingProps = requiredProps.filter(prop => !(prop in cfg));
if (missingProps.length === 0) {
    console.log('✓ All required properties are present');
} else {
    console.error('✗ Missing required properties:', missingProps.join(', '));    
    process.exit(1);
}

console.log('\n=== Config Test Completed Successfully ===');
