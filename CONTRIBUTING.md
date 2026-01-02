
# Contributing to Sci-Lighter

Thank you for contributing! To maintain extension-grade quality, please adhere to these standards.

## 🛡 Security & Privacy (Chrome MV3)

1.  **Minimal Permissions**: Only request permissions in `manifest.json` that are absolutely necessary for the feature. Use `optional_permissions` for high-privacy features like microphone access.
2.  **No Remote Code**: All logic must be contained within the package. For production, dependencies from `esm.sh` must be bundled locally.
3.  **Sanitized Injection**: When injecting the `AnnotationCanvas` or `Toolbar` into the host page, use a **Shadow DOM** to prevent CSS leakage and protect against script interference from the host website.

## 🎨 Design Principles

1.  **Pedagogical First**: Every feature should assist in the *synthesis* of knowledge, not just collection.
2.  **Performance Matters**: Canvas operations must remain fluid (60fps). Avoid React re-renders in the main drawing loop.
3.  **Side-Panel Optimization**: Ensure all UI elements are responsive and usable at narrow widths (minimum 320px).

## 🛠 Coding Standards

### UI Composition
- **Extract Cards**: If you are rendering a list item with its own actions, extract it into a separate `Card` component.
- **Visual Polish**: Use Tailwind's `animate-in` and `fade-in` to maintain a professional feel.

### State Management
- **Functional Updates**: Always use `setProject(prev => ...)` in Zustand to ensure multi-tab sync reliability via `BroadcastChannel`.
- **Persistence**: While using `localStorage` for this prototype, use the `chrome.storage.local` wrapper for production to ensure data persists across browser sessions.

## 🔄 Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`.
