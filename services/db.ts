
import Dexie, { type EntityTable } from 'dexie';
import { AnnotationProject, User } from '../types';

/**
 * WebMark DB - High performance persistence layer
 */
// Fix: Extending from the default Dexie export ensures that prototype methods like version() 
// are correctly inherited and accessible within the subclass constructor.
class WebMarkDatabase extends Dexie {
  projects!: EntityTable<AnnotationProject, 'id'>;
  users!: EntityTable<User, 'id'>;

  constructor() {
    // Initializing the database with its name
    super('WebMarkProDB');
    
    // Defining the database schema. 
    // The version() method is inherited from the Dexie base class.
    this.version(1).stores({
      projects: 'id, url, title, ownerId, updatedAt',
      users: 'id, email, name'
    });
  }
}

export const db = new WebMarkDatabase();

export const saveProjectToDB = async (project: AnnotationProject) => {
  try {
    await db.projects.put({
      ...project,
      updatedAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error("Dexie Save Error:", error);
    return false;
  }
};

export const loadProjectsFromDB = async (userId: string): Promise<AnnotationProject[]> => {
  try {
    return await db.projects
      .where('ownerId')
      .equals(userId)
      .reverse()
      .sortBy('updatedAt');
  } catch (error) {
    console.error("Dexie Load Error:", error);
    return [];
  }
};

export const clearProjectData = async (projectId: string) => {
  try {
    const project = await db.projects.get(projectId);
    if (project) {
      await db.projects.update(projectId, {
        drawings: [],
        textAnnotations: [],
        synapses: [],
        updatedAt: Date.now()
      });
    }
    return true;
  } catch (error) {
    console.error("Dexie Clear Error:", error);
    return false;
  }
};
