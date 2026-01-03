---
description: MANDATORY Testing Strategy - The "Real Code" Philosophy
---

# The "Real Code" Verification Philosophy

## Core Tenet: NO MOCKS
We do **NOT** use mock-heavy unit tests that isolate components from reality.
We do **NOT** mock internal services, database layers, or the application state store.

**Why?**
1.  **Tests Reality**: Mocks verify what you *think* the code does. Real scripts verify what it *actually* does.
2.  **Forces Better Architecture**: To test without mocks, you are forced to decouple Business Logic from UI, leading to cleaner code (e.g., `ProjectController`).
3.  **Resilience**: Internal refactors don't break tests if the public API remains the same. Mocks create brittle tests.

## The "Headless API" Pattern

To enable this testing strategy, the application must be architected to be driven without a UI (Headless).

### 1. Extract Logic to Controllers
Do not put complex business logic or message orchestration inside React Components (`App.tsx`, `useEffect`).
Instead, encapsulate it in a **Service** or **Controller** class (e.g., `services/ProjectController.ts`).

-   **Bad**: `useEffect(() => { chrome.runtime.onMessage... })` inside `App.tsx`.
-   **Good**: `class ProjectController { initListeners() { ... } }` instantiated by `App.tsx`.

### 2. Create Standalone Verification Scripts
Create pure TypeScript scripts in `tests/` meant to be run with `npx tsx tests/my_script.ts`.

-   **Polyfills**: Use `tests/chrome_polyfill.ts` to simulate browser globals (`chrome`, `window`, `navigator`) strictly for environmental compatibility, NOT logic mocking.
-   **Real Dependencies**: Import the *real* Store (`useStore`), the *real* Database service (`db`), and the *real* Controller.
-   **Execution**:
    1.  Setup Polyfill.
    2.  Instantiate Controller.
    3.  Drive inputs (simulate messages or helper function calls).
    4.  Await async operations.
    5.  Assert against the *real* persisted state (e.g., query the DB).

## Example: Verifying Persistence

**Do not write:** A Jest test that mocks `chrome.runtime` and checks if `saveProjectToDB` was called. (Passes even if DB is broken).

**Write:** A `tests/verify_persistence.ts` script that:
1.  Sends a message to the controller.
2.  Waits 1 second.
3.  Reads the actual Dexie DB to confirm the record exists.

## Usage
When an agent is asked to "test" or "verify":
1.  Check for existing Headless APIs.
2.  If missing, Refactor the code to expose one.
3.  Write a standalone `.ts` script.
4.  Run it using `npx tsx`.
