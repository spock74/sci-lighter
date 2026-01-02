
/**
 * Core domain types for WebMark Pro.
 * Follows a graph-based PKM (Personal Knowledge Management) model.
 */

export enum ToolType {
  PEN = 'PEN',
  HIGHLIGHTER = 'HIGHLIGHTER',
  ERASER = 'ERASER',
  TEXT_ANNOTATOR = 'TEXT_ANNOTATOR',
  CURSOR = 'CURSOR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

/** Represents a vector drawing path or a text note on the canvas */
export interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: ToolType;
  authorId?: string;
  layerId: string;
  /** Optional text content if the tool is used for labeling */
  text?: string;
}

export type AnnotationVariant = 'highlight' | 'underline' | 'both';

/** 
 * Represents a captured insight from page text.
 * Includes metadata for 'Teleportation' via Chrome Text Fragments.
 */
export interface TextAnnotation {
  id: string;
  text: string;
  comment?: string;
  color: string;
  timestamp: number;
  startOffset: number;
  endOffset: number;
  authorId?: string;
  variant?: AnnotationVariant;
  /** The source page address */
  url: string;
  pageTitle: string;
  /** Non-brittle deep link using Chrome Text Fragment API */
  /** Non-brittle deep link using Chrome Text Fragment API */
  fragmentUrl?: string; 
  /** Edit history for the comment */
  history?: NoteVersion[];
}

export interface NoteVersion {
  id: string;
  content: string;
  timestamp: number;
}

/** 
 * Represents a logical connection between two thoughts.
 * This is the 'edge' in our knowledge graph.
 */
export interface Synapse {
  id: string;
  sourceAnnotationId: string;
  targetAnnotationId: string;
  /** The user's synthesized conclusion linking the two notes */
  conclusion: string;
  timestamp: number;
  authorId: string;
}

export type Role = 'owner' | 'editor' | 'viewer';

/** 
 * Root container for a research session.
 * Encapsulates all state required to reconstruct a user's study environment.
 */
export interface AnnotationProject {
  id: string;
  title: string;
  url: string;
  content: string;
  drawings: DrawingPath[];
  textAnnotations: TextAnnotation[];
  synapses: Synapse[];
  layers: Layer[];
  activeLayerId: string;
  updatedAt: number;
  ownerId: string;
  collaborators: { userId: string; role: Role }[];
}
