# Testing in Our Development Environment

## Overview
This document provides a comprehensive guide to the testing setup and practices in the NodeTakeOver project. It covers the current testing infrastructure, tools, patterns, and guidelines for writing and maintaining tests.

## Table of Contents
1. [Testing Stack](#testing-stack)
2. [Project Structure](#project-structure)
3. [Test Types and Their Purposes](#test-types)
4. [Running Tests](#running-tests)
5. [Testing Patterns and Best Practices](#testing-patterns)
6. [Current Limitations and Known Issues](#current-limitations)
7. [Future Improvements](#future-improvements)
8. [Useful Commands](#useful-commands)

## Testing Stack

### Core Testing Framework
- **Jest**: Primary test runner and assertion library
- **@testing-library/dom**: For testing DOM interactions
- **@testing-library/user-event**: For simulating user interactions
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing

### Type Checking
- **TypeScript**: Type checking for `.ts` files
- **@types/jest**: TypeScript definitions for Jest

### Code Quality
- **ESLint**: Code linting with TypeScript support
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks

## Project Structure

```
__tests__/
  Game.test.js        # Main game logic tests
  Game.fixed.test.js  # Fixed/regression tests for Game
  Node.test.js        # Node class tests
  Wall.test.ts        # Wall class tests (TypeScript)
  config.test.js      # Configuration tests
  # ... other test files

jest.setup.js        # Global test setup
jest.config.js       # Jest configuration
```

## Test Types

### 1. Unit Tests
- **Location**: `__tests__/` directory
- **Purpose**: Test individual components/functions in isolation
- **Examples**:
  - `Node.test.js`: Tests for Node class functionality
  - `Wall.test.ts`: Tests for Wall class functionality

### 2. Integration Tests
- **Location**: `__tests__/` directory (files with `.test.js` suffix)
- **Purpose**: Test interactions between components
- **Examples**:
  - `Game.test.js`: Tests game mechanics and component interactions

### 3. Fixed/Regression Tests
- **Location**: `__tests__/Game.fixed.test.js`
- **Purpose**: Ensure fixed bugs don't regress
- **Notes**:
  - Contains tests for previously fixed issues
  - Should always pass once an issue is resolved

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- __tests__/Game.test.js

# Generate coverage report
npm run test:coverage
```

### Test Environment
- **JSDOM**: Simulates a browser environment in Node.js
- **Global Setup**: `jest.setup.js` configures the test environment
- **Type Checking**: TypeScript files are compiled on the fly during tests

## Testing Patterns

### DOM Testing
- Use `@testing-library/dom` for querying and interacting with the DOM
- Follow the Testing Library guiding principles:
  - Test behavior, not implementation
  - Prefer accessible queries (getByRole, getByLabelText, etc.)

### Mocking
- Use Jest's built-in mocking capabilities
- Mock external dependencies to isolate units under test
- Example:
  ```javascript
  jest.mock('../src/someModule', () => ({
    someFunction: jest.fn()
  }));
  ```

### Test Structure
Follow the Arrange-Act-Assert pattern:
```javascript
describe('Component', () => {
  beforeEach(() => {
    // Setup code
  });

  it('should do something', () => {
    // Arrange
    const value = 42;
    
    // Act
    const result = someFunction(value);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

## Current Limitations

1. **DOM Testing**: Some DOM-related tests may fail due to missing JSDOM setup
2. **Test Coverage**: Incomplete test coverage for some components
3. **Type Safety**: Mixed JavaScript/TypeScript codebase
4. **Test Data**: No centralized test data/fixtures

## Future Improvements

1. **Enhance Test Setup**:
   - Complete JSDOM configuration in `jest.setup.js`
   - Add custom matchers and utilities
   - Set up test data factories

2. **Improve Test Coverage**:
   - Add tests for untested components
   - Increase test coverage threshold
   - Add integration tests

3. **Code Quality**:
   - Enforce test coverage requirements
   - Add TypeScript to all test files
   - Set up pre-commit hooks for testing

4. **Performance**:
   - Optimize test execution time
   - Parallelize independent tests
   - Add performance benchmarks

## Useful Commands

```bash
# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- __tests__/path/to/test.js

# Run tests matching a pattern
npm test -- -t "test description"

# Update snapshots
npm test -- -u
```

## Troubleshooting

### Common Issues
1. **DOM-related errors**: Ensure `jest.setup.js` properly sets up JSDOM
2. **Type errors**: Run TypeScript type checking separately
3. **Test isolation**: Use `beforeEach`/`afterEach` to reset state

### Debugging Tests
- Use `console.log()` or `debug()` from `@testing-library/dom`
- Run tests with `--runInBand` flag for better error messages
- Use `--verbose` flag for more detailed output

## Contributing

When adding new tests:
1. Follow existing patterns and conventions
2. Add appropriate test descriptions
3. Ensure tests are isolated and independent
4. Update this documentation if introducing new patterns or tools
