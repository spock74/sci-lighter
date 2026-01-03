
import { useStore } from '../store/useStore';
import { sendToContentScript } from './bridge';
import { BridgeAction } from './bridge';
import { clearProjectData } from './db';

/**
 * ProjectController
 * 
 * Acting as a "Headless" Controller for the application.
 * It manages the communication between the Chrome Runtime (Messages) and the Global Store (Zustand).
 * 
 * This allows the application logic to be run and tested in environments without a UI (e.g. Node scripts).
 */
export class ProjectController {
  private cleanupFns: Function[] = [];

  constructor() {
    this.initMessageListeners();
    this.initStoreSubscriptions();
  }

  /**
   * Initialize listeners for Chrome Runtime / Content Script messages
   */
  private initMessageListeners() {
    const handleMessage = (request: any, sender: any, sendResponse: any) => {
      // 1. SAVE_DRAWINGS: Content script sends new drawings
      if (request.action === 'SAVE_DRAWINGS') {
        const newDrawings = request.payload;
        // Direct update to store. Store handles DB persistence via its 'setProject' logic.
        useStore.getState().setProject((prev) => ({ 
            ...prev, 
            drawings: newDrawings 
        }));
      }

      // 2. HIGHLIGHT_CLICKED: User clicked a highlight on page
      if (request.action === 'HIGHLIGHT_CLICKED' && request.payload?.id) {
        // We find the annotation in the project
        const project = useStore.getState().project;
        if (project) {
          const annotation = project.textAnnotations.find(a => a.id === request.payload.id);
          // logic to "edit" would typically be callback based or store based.
          // For now, we don't have a 'editing' state in store global enough for this refactor without larger changes,
          // but we can expose an event emitter if needed. 
          // However, for this specific refactor (Persistence), we focus on Data.
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    this.cleanupFns.push(() => chrome.runtime.onMessage.removeListener(handleMessage));
  }

  /**
   * Subscribe to Store changes to Sync back to the Content Script
   */
  private initStoreSubscriptions() {
    // A. Sync Active Tool (Toolbar -> Page)
    let previousTool = useStore.getState().activeTool;
    const unsubTool = useStore.subscribe((state) => {
        if (state.activeTool !== previousTool) {
            this.syncToActiveTab('SET_TOOL', state.activeTool);
            previousTool = state.activeTool;
        }
    });
    this.cleanupFns.push(unsubTool);

    // B. Sync Drawings (Store/DB -> Page)
    // We debounce this slightly to avoid sending every single stroke update if we were capturing live
    let previousDrawings = useStore.getState().project.drawings;
    let timeoutId: NodeJS.Timeout;
    
    const unsubDrawings = useStore.subscribe((state) => {
        if (state.project.drawings !== previousDrawings) {
            previousDrawings = state.project.drawings;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.syncToActiveTab('SYNC_DRAWINGS', state.project.drawings);
            }, 100);
        }
    });
    
    this.cleanupFns.push(() => {
        unsubDrawings();
        clearTimeout(timeoutId);
    });
  }

  /**
   * Helper to send data to the active tab's content script
   */
  private syncToActiveTab(action: BridgeAction, payload: any) {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    // We use the callback style for query as it's universally supported in extension API and our polyfill
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        if (tabs && tabs[0]?.id) {
            sendToContentScript(tabs[0].id, action, payload).catch(err => {
                // Ignore connection errors (normal during page loads)
            });
        }
    });
  }

  public dispose() {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
  }
}
