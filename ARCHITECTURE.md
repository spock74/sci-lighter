
# Technical Architecture & Extension Adherence

This document details the engineering decisions behind WebMark Pro and its adherence to **Google Chrome Extension Manifest V3** standards.

## 1. Manifest V3 Compliance
WebMark Pro is architected to satisfy the modern security and performance requirements of the Chrome Web Store.

### Service Workers vs. Background Pages
The application logic is decoupled from a persistent background page. Instead:
- **State Persistence**: Zustand state is mirrored to `localStorage`. In a packaged production build, the store middleware should be swapped to use `chrome.storage.local` to ensure data persists across background service worker suspensions.
- **Task Management**: Long-running tasks (like AI analysis) are treated as discrete operations that can survive Service Worker suspension.

### Content Security Policy (CSP)
To adhere to Chrome's "No Remote Code" policy:
- **Bundling**: While this prototype uses `esm.sh` for development agility, the production pipeline is designed to bundle all React and Gemini SDK dependencies into the local extension package.
- **Inline Scripts**: All logic is moved to external `.js` modules. No `eval()` or `new Function()` calls are used.

## 2. Component Mapping
The UI composition pattern maps directly to Chrome Extension entry points:

| Web Component | Extension Context | Purpose |
| :--- | :--- | :--- |
| `App.tsx` | `side_panel.html` | Persistent research environment and workbench. |
| `AnnotationCanvas` | `content_script.js` | Zero-latency drawing layer injected into the host DOM. |
| `Toolbar` | `shadow_dom` | Floating UI injected into the page via Content Script. |
| `services/cloud.ts` | `background.js` | Orchestrator for sync and Gemini API calls. |

## 3. Global Contexts & Design System
WebMark Pro uses a **Context-Driven Architecture** for cross-cutting concerns:

- **ThemeContext**: Manages the application's visual state (Light/Dark). It provides CSS variables for Tailwind and raw hex/rgba tokens for the Canvas drawing engine.
- **LanguageContext**: Orchestrates the i18n system. All UI strings are retrieved via a central `t()` function, allowing for instant language switching without state loss.

## 4. Data Model: The Synapse Graph
Instead of a flat list of highlights, WebMark Pro treats knowledge as a graph.
- **Nodes**: `TextAnnotation` (Captured data).
- **Edges**: `Synapse` (User-generated relationship).

## 5. UI Composition Pattern
The application follows a strict **Composition Pattern**.
- **Orchestrators (Smart)**: `App.tsx`, `Workbench.tsx`. These handle state logic and API orchestration.
- **Molecules (Presentational)**: `HighlightCard.tsx`, `SynapseCard.tsx`. These are stateless, focused on high-fidelity rendering and user feedback.

## 6. Reactive State Synchronization
WebMark Pro uses a hybrid local/sync state model. The `store/useStore.ts` utilizes functional updates to handle incoming data from the `BroadcastChannel API`, which functions consistently across extension side-panels and popups.

## 7. Text Fragment Teleportation
Uses **Scroll-to-Text Fragments** for non-brittle deep linking:
`#:~:text=[prefix-,]text_start[,text_end][,-suffix]`
This requires no special permissions and respects user privacy as it doesn't read the DOM after navigation.
