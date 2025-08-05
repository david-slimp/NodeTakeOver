import { cfg, seededRandomGenerator, rngInstance } from '../src/config.ts';

describe('Configuration', () => {
  test('should have expected properties', () => {
    expect(cfg).toHaveProperty('VERSION');
    expect(cfg).toHaveProperty('width', 800);
    expect(cfg).toHaveProperty('height', 600);
    expect(cfg).toHaveProperty('seed', 1234);
    expect(cfg).toHaveProperty('TOTAL_NODES', 20);
    expect(cfg).toHaveProperty('nodeRadius', 30);
  });

  test('should have player configuration', () => {
    expect(cfg).toHaveProperty('PLAYER_COLOR');
    expect(cfg).toHaveProperty('PLAYER_START_UNITS', 50);
    expect(cfg).toHaveProperty('PLAYER_UNIT_GENERATION_SPEED', 6);
  });

  test('should have computer configuration', () => {
    expect(cfg).toHaveProperty('COMPUTER_COLOR');
    expect(cfg).toHaveProperty('COMPUTER_START_UNITS', 80);
    expect(cfg).toHaveProperty('COMPUTER_UNIT_GENERATION_SPEED', 6);
  });

  test('should have wall configuration', () => {
    expect(cfg).toHaveProperty('WALL_COUNT', 50);
    expect(cfg).toHaveProperty('WALL_COLOR');
    expect(cfg).toHaveProperty('WALL_WIDTH', 5);
  });
});

describe('seededRandomGenerator', () => {
  test('should return a function', () => {
    const rng = seededRandomGenerator(123);
    expect(typeof rng).toBe('function');
  });

  test('should produce the same sequence for the same seed', () => {
    const rng1 = seededRandomGenerator(123);
    const rng2 = seededRandomGenerator(123);
    
    // First call
    expect(rng1()).toBe(rng2());
    
    // Second call
    expect(rng1()).toBe(rng2());
    
    // Third call
    expect(rng1()).toBe(rng2());
  });

  test('should produce different sequences for different seeds', () => {
    const rng1 = seededRandomGenerator(123);
    const rng2 = seededRandomGenerator(456);
    
    // Should be different
    expect(rng1()).not.toBe(rng2());
  });

  test('should produce values between 0 and 1', () => {
    const rng = seededRandomGenerator(123);
    
    for (let i = 0; i < 100; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test('rngInstance should be a seeded random number generator', () => {
    expect(typeof rngInstance).toBe('function');
    
    // Get the first value from the RNG with seed 1234
    const firstValue = rngInstance();
    
    // Verify it's a number between 0 and 1
    expect(firstValue).toBeGreaterThanOrEqual(0);
    expect(firstValue).toBeLessThan(1);
    
    // Verify it produces the same value when recreated with the same seed
    const newRng = seededRandomGenerator(1234);
    expect(newRng()).toBeCloseTo(firstValue, 10);
  });
});
