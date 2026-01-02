import { TextAnnotation } from '../types';
import { Locale } from '../translations';

// Message Action Types
export type BridgeAction = 
  | 'PING'
  | 'GET_PAGE_CONTENT'
  | 'SCROLL_TO_HIGHLIGHT'
  | 'CREATE_HIGHLIGHT'
  | 'UPDATE_HIGHLIGHT'
  | 'DELETE_HIGHLIGHT'
  | 'TEXT_SELECTED'
  | 'SYNC_LOCALE'
  | 'CLEAR_HIGHLIGHTS'
  | 'HIGHLIGHT_CLICKED';

// Payload Types
export interface BridgeMessage<T = any> {
  action: BridgeAction;
  payload?: T;
}

export interface HighlightPayload {
  id: string;
  text: string; // For verification
}

export interface ScrollPayload {
  id: string;
}

export interface SelectionPayload {
  text: string;
  range?: {
      start: number;
      length: number;
  };
}

export interface LocalePayload {
  locale: Locale;
}

// Type-safe wrapper for sending messages to Content Script (from Side Panel/Background)
export const sendToContentScript = async <T = any, R = any>(
  tabId: number, 
  action: BridgeAction, 
  payload?: T
): Promise<R> => {
  try {
      return await chrome.tabs.sendMessage(tabId, { action, payload });
  } catch (error) {
      console.warn(`Bridge error sending ${action} to tab ${tabId}:`, error);
      throw error;
  }
};

// Type-safe wrapper for sending messages to Runtime (from Content Script to Side Panel/Background)
export const sendToRuntime = async <T = any, R = any>(
  action: BridgeAction, 
  payload?: T
): Promise<R> => {
  try {
      return await chrome.runtime.sendMessage({ action, payload });
  } catch (error) {
     console.warn(`Bridge error sending ${action} to runtime:`, error);
     throw error;
  }
};
