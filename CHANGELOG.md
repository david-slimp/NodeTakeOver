# Changelog

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
