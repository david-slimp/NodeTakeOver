# Changelog

## [0.3.2] - 2025-12-15

### Added
- Centralized UI ownership in `UIRenderer` (HUD + game-over overlay)
- Game-over restart UX: Enter-to-submit, visible "Go" button, suggested next seed (`seed + 1`)
- Test coverage for the new UI ownership/restart behavior

### Changed
- Removed duplicate UI elements from `index.html` (UI is now created/managed by `UIRenderer`)
- Simplified `main.js` startup to rely on config defaults and avoid direct DOM wiring for restart/seed
- Updated `Game.displayGameOver` to delegate UI rendering to `UIRenderer` instead of writing directly into DOM
- Adjusted page layout so the canvas is not clipped when HUD is present
- Restart/lifecycle: `main.js` is now the single restart path and injects a shared `UIRenderer` into `Game`
- Type cleanup: removed duplicate config types (`types/config.d.ts`), keeping `src/types/config.ts` as the source of truth
- Gameplay tuning: set `PLAYER_UNIT_SPEED` and `COMPUTER_UNIT_SPEED` to the same slower value and stopped overriding speed at runtime

### Fixed
- Restart flow now works reliably from both button click and Enter key in the seed field
- Game lifecycle now starts exactly one `requestAnimationFrame` loop (no double-start from `initGame()`)

## [0.3.1] - 2025-08-06

### Added
- Migrated `wall.js` to TypeScript as `wall.ts` with full type safety
- Comprehensive test suite for Wall class with 100% line coverage
- Detailed JSDoc documentation for all Wall class methods
- Made Wall position properties readonly to enforce immutability

### Changed
- Removed deprecated `wall.js` file as part of TypeScript migration
- Reduced number of nodes from 20 to 15 for better gameplay balance
- Increased number of walls from 50 to 80 for more strategic depth

### Fixed
- Improved wall placement validation to prevent invalid wall positions
- Enhanced type safety throughout the wall-related code
- Optimized wall collision detection performance

## [0.3.0] - 2025-08-05

### Added
- Migrated Node class to TypeScript for better type safety and maintainability
- Created new NodeRenderer class to separate rendering logic from game logic
- Added comprehensive test coverage for Node class and NodeRenderer
- Implemented debug mode with '?' key toggle for node chain visualization
- Added automated smoke tests for build verification
- New dev:test npm script for one-command build, test, and server start

### Fixed
- Fixed issue with continuous drawNodeChain rendering after UI restart
- Fixed port handling in smoke tests for cross-platform compatibility
- Properly handle server process cleanup and restart
- Fixed debug mode persistence across game restarts

### Changed
- Separated rendering logic from Node class into dedicated NodeRenderer
- Improved code organization and type safety with TypeScript
- Enhanced test automation and reliability
- Updated build process to handle TypeScript compilation

## [0.2.2] - 2025-08-04

### Fixed

- Fixed pause functionality to properly freeze all game activity including unit movement and battles
- Units now remain visible but frozen in place when game is paused
- Battle resolution is now properly paused and resumed with the game state
- Fixed timing issues with attack animations during pause/unpause

## [0.2.1] - 2025-08-04

### Fixed

- Made the restart button visible immediately when the game loads
- Added basic ESLint configuration to fix pre-commit hook issues

### Documentation

- Updated README.md with detailed game instructions, features, and setup guide
- Added link to online playable version at rock808.com

## [0.2.0] - 2025-04-15

### Changed

- Broke monolithic file in to modular files for easier expansion.

### Fixed

- RNG issues with modular version.

## [0.1.0] - 2024-10-20 (MVP version)

### Added

- Seed number works for consistent map generation.

## [0.0.7] - 2024-08-19

### Added

- Keyboard controls:
    - P/SPACE to pause
    - M to mute
    - H for help
    - R to restart
- Pause functionality with overlay
- Mute/unmute button and functionality
- Help popup window

### Changed

- Change number of walls based on screen size

## [0.0.6] - 2024-07-12

### Added

- Walls to the game board
- "Chain" connecting all nodes to ensure reachability
- Minimum distance between human/computer start nodes
- Version and changelog information

### Changed

- Tweaked gameplay variables

## [0.0.5] - 2024-07-11

### Added

- Support for playing on phone (touch sensitivity and screen dimensions)

### Changed

- Split variables into separate ones for human and computer players

## [0.0.4] - 2024-07-11

### Added

- Gold score for each win
- "Restart" button at end of game

### Changed

- Improved animation/flow for unit movement
- Computer now only sends 1 unit at a time
- Reduced computer delay to 3 seconds when taking new nodes

### Fixed

- Some generationSpeed settings adjusted to balance computer attacks against vacant nodes

### Known Issues

- Strange anomaly causing generationSpeed to increase slightly after each game

## [0.0.3] - 2024-07-10

### Added

- 14-second delay for computer to move after any player captures a new node

### Changed

- Prevented node overlap
- Increased overall game speed

## [0.0.2] - 2024-07-10

### Added

- Continuous unit sending from nodes
- Single-click functionality to stop sending from a node

## [0.0.1] - 2024-07-10

### Initial Release

- 10 Nodes only
- Human vs Computer gameplay
- Slow node growth
- Click/drag to send half of a node's units
