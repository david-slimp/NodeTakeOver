
Here is my "New Day" developer AI prompt for firing up Windsruf again and
getting back to work for the next day/sprint/project:
"
Let's look over the main codebase for this game project. There are about 8 or so main active game files. We are in the process of migrating from JS to TS.  I think we have finished the config.ts and node.ts so far, but let's double check where we are at in this process.
We also want to confirm our devel environment.... I think we are using some testing framework to make sure we keep stable and bug-free code.  There could be a couple different layers of tests?
What are some suggestions for our next coding sprint today?
"

=============================================
Current Wall Class Methods

Instance Methods
1. constructor(x1, y1, x2, y2)
- Core functionality - should stay in Wall class
- Purpose: Creates a wall with start and end coordinates
2. draw(ctx)
- Rendering functionality
- Could potentially be moved to a WallRenderer class if rendering becomes more complex
- For now, can stay in Wall class

Static Methods (Potential Utility Candidates)

Wall Generation

3. static generateWalls(count, nodes, chain, rng)
- Wall-specific logic
- Should stay in Wall class as it's a factory method
4. static createWall(rng)
- Wall creation logic
- Should stay in Wall class as a factory method

Collision Detection
5. static isWallPositionValid(wall, walls, nodes, chain)
- High-level validation
- Should stay in Wall class as it coordinates other validations
6. static linesIntersect(w1, w2)
- Pure geometry function
- Could be moved to a geometry.ts utility file
- Used by multiple classes (Wall, potentially others)
7. static lineIntersectsNode(wall, node)
- Specific to Wall-Node interaction
- Could be moved to a collision.ts utility file
- Or stay in Wall class as it's wall-specific

Commented-out Code
8. lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r)
- More general version of lineIntersectsNode
- Should be moved to geometry.ts if uncommented
9. isPathBlocked(node1, node2)
- Game-specific logic
- Could be moved to a gameLogic.ts or similar


Proposed Modular Structure
1. Keep in Wall Class:
-constructor
-draw (for now)
-generateWalls
-createWall
-isWallPositionValid

2. Move to src/utils/geometry.ts:
- linesIntersect
- lineIntersectsCircle (if uncommented)
- Other geometric utilities

3. Move to src/utils/collision.ts:
- lineIntersectsNode
- Other collision detection functions

4. Move to src/utils/random.ts:
- Any RNG-related utilities

5. Move to src/game/:
- Game-specific logic like isPathBlocked

Suggested Next Steps
1. Create the utility files:
    bash
    mkdir -p src/utils
    touch src/utils/geometry.ts
    touch src/utils/collision.ts
2. Move the appropriate functions to these files
3. Update imports in Wall class
4. Add proper TypeScript types
5. Add unit tests for the utility functions
=============================================

Here’s a revised and reorganized list that now integrates both the original 25 issues and these new considerations. The goal is to prioritize what will most help accelerate future development, streamline the codebase, and reduce risk, especially for upcoming features and collaboration.

---

### 🔥 **High-Impact / Foundational Fixes (Top Priority)**

These affect development velocity, code maintainability, and scalability.

1. **TypeScript Migration**

   * Inconsistent use of `.js` and `.ts` files.
   * `tsconfig.json` needs tightening (`noEmit: true`, `strict: false`).
   * Moving to stricter, consistent TS improves safety, readability, and tooling support.

2. **Lack of Documentation (JSDoc / TypeDoc)**

   * Functions and modules lack doc comments.
   * Improves onboarding, collaboration, and future-proofing.

3. **No Unit Tests**

   * No structured test coverage makes refactoring risky.
   * Expand Jest setup and add testing patterns/utilities.

4. **Code Duplication**

   * Especially around node and unit handling.
   * Refactor into reusable modules for clarity and DRY code.

5. **Potential Memory Leaks in Event Listeners**

   * Not cleaned up properly after reset/init.
   * Can cause bugs, slowness, and unpredictable behavior in long sessions.

6. **Build Process Is Minimal**

   * Current setup copies files; no bundler.
   * Consider Vite, esbuild, or Webpack for bundling, optimizations, and DX.

7. **No Environment Management**

   * No `.env` or separation between dev/prod/staging.
   * Use `dotenv` or similar for config and secrets.

8. **Potential Performance Issues**

   * Wall collision detection, animation loops, and node chain creation (O(n²)) are costly.
   * Consider spatial partitioning or caching for optimization.

9. **State Management Could Be More Robust**

   * `isPaused`, `gameActive`, and related flags are fragile.
   * Could evolve into a finite state machine pattern or Redux-style state management.

10. **Inconsistent Logging**

    * Logs aren't standardized.
    * Use a centralized logger with verbosity levels.

---

### 🧰 **Medium Priority: Dev Environment & Code Quality**

These items improve dev confidence and automation.

11. **Development Workflow Improvements**

    * Husky exists; verify hook usage.
    * Add commit message linting (`commitlint`) and formatters (`prettier`, `eslint`).

12. **No Error Boundaries / Graceful Error Handling**

    * Runtime issues can crash or hang the game.
    * Improve `try/catch` coverage and feedback to the user.

13. **Hardcoded Values**

    * Found in `config.js` and scattered constants.
    * Move to central config/constants with explanations.

14. **Missing Input Validation**

    * Functions like `getNodeAt()` don’t validate input well.
    * Could crash or cause undefined behavior.

15. **Incomplete Error Handling**

    * E.g. constructor not throwing if canvas not found.
    * Fails silently, which hurts debugging.

16. **Testing Utilities / Patterns Missing**

    * Build helper functions and mocking tools.
    * Add coverage for different canvas states, node configs, etc.

---

### ⚙️ **Lower Priority: Gameplay / UI / User-Facing**

Nice to have, not blocking current progress.

17. **No Input Throttling**

    * Rapid taps/clicks may break logic or spam UI.
    * Throttle debounced interactions.

18. **Missing Game State Validation**

    * Validate that the state is consistent across updates/resets.

19. **Potential Race Conditions**

    * Multiple `requestAnimationFrame` calls or async behaviors may conflict.
    * Especially after reset/reinit.

20. **Inefficient Redraws**

    * Full canvas redraw each frame may be overkill.
    * Use offscreen canvas only where necessary.

21. **No Loading State**

    * Add feedback while initializing game/assets.

22. **Hardcoded Styling**

    * Move inline styles into a CSS file or CSS module.

23. **Game Balance Tuning**

    * Currently hardcoded and not externally configurable.
    * Consider externalizing balance values.

24. **Limited Mobile Support**

    * Canvas scaling, spacing, and controls need optimization.

25. **Missing Accessibility Features**

    * ARIA attributes, keyboard nav, etc. not yet present.

---

### ➕ **New Item to Add**

26. **Dependency Management / npm-check-updates**

* Keep devDependencies up to date to avoid security and compatibility issues.

---

This updated list is now optimized for prioritizing **velocity**, **clarity**, and **scalability**. Let me know if you’d like it in markdown format for your GitHub README, or as GitHub issues/milestones!
