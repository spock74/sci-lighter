
# Production Manifest V3 Template

Use this template when packaging WebMark Pro for the Chrome Web Store.

```json
{
  "manifest_version": 3,
  "name": "WebMark Pro",
  "version": "1.0.0",
  "description": "Advanced text annotation and sketching for research.",
  "permissions": [
    "storage",
    "sidePanel",
    "activeTab",
    "scripting"
  ],
  "optional_permissions": [
    "audio"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "side_panel": {
    "default_path": "index.html"
  },
  "action": {
    "default_title": "Open WebMark Pro"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["assets/*"],
      "matches": ["<all_urls>"]
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
```

### Deployment Checklist:
1. **Host Permissions**: Avoid `<all_urls>` if possible; prefer `activeTab`.
2. **Audio**: Ensure `audio` permission is requested only when the user activates the Gemini Live feature.
3. **Icons**: Provide 16x16, 48x48, and 128x128 icons in the `assets/` folder.
