
import Dexie, { type EntityTable } from 'dexie';
import { AnnotationProject, User } from '../types';

/**
 * Sci-Lighter DB - High performance persistence layer
 */
// Fix: Extending from the default Dexie export ensures that prototype methods like version() 
// are correctly inherited and accessible within the subclass constructor.
class SciLighterDatabase extends Dexie {
  projects!: EntityTable<AnnotationProject, 'id'>;
  users!: EntityTable<User, 'id'>;

  constructor() {
    // Initializing the database with its name
    super('SciLighterProDB');
    
    // Defining the database schema. 
    // The version() method is inherited from the Dexie base class.
    this.version(1).stores({
      projects: 'id, url, title, ownerId, updatedAt',
      users: 'id, email, name'
    });
  }
}

export const db = new SciLighterDatabase();


// EXPERIMENTAL: Force Persistent Storage
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(granted => {
    console.log("Sci-Lighter: Storage persistence granted?", granted);
    // Check for Incognito/Private mode
    if (chrome.extension && chrome.extension.inIncognitoContext) {
      console.warn("Sci-Lighter WARNING: Running in Incognito Context! Storage may be ephemeral.");
    }
    navigator.storage.estimate().then(estimate => {
      console.log("Sci-Lighter: Storage usage:", estimate.usage, "quota:", estimate.quota);
    });
  });
}

db.on('versionchange', function(event) {
  console.log("Dexie: Database version changed!", event);
});
db.on('populate', () => {
  console.log("Dexie: Database populated (First creation)");
});


export const saveProjectToDB = async (project: AnnotationProject) => {
  try {
    // Transactional Write: Ensures atomicity and proper committing
    await db.transaction('rw', db.projects, async () => {
      await db.projects.put({
        ...project,
        updatedAt: Date.now()
      });
      console.log(`Dexie (Transaction): Scheduled save for project ${project.id}`);
    });

    console.log(`Dexie: Transaction committed for project ${project.id}. Owner: '${project.ownerId}'`);

    // IMMEDIATE VERIFICATION (Read-After-Write)
    // We check AFTER the transaction completes to confirm it hit the disk.
    const verifyCheck = await db.projects.get(project.id);
    const verifyCount = await db.projects.count();

    if (!verifyCheck) {
      console.error("Dexie CRITICAL: Write transaction finished, but Read failed!", { projectId: project.id });
    } else {
      console.log("Dexie VERIFY: Data persisted successfully.", {
        savedId: verifyCheck.id,
        totalProjects: verifyCount,
        ownerId: verifyCheck.ownerId,
        annotationCount: verifyCheck.textAnnotations?.length || 0
      });
    }

    return true;
  } catch (error) {
    console.error("Dexie Save Error (Transaction Failed):", error);
    return false;
  }
};

export const loadProjectsFromDB = async (userId: string): Promise<AnnotationProject[]> => {
  try {
    // Debug: Check ALL projects in DB
    const allCount = await db.projects.count();
    const allDump = await db.projects.toArray();
    console.log(`Dexie: TOTAL projects in DB: ${allCount}`);
    console.log(`Dexie: ALL Projects Dump:`, allDump); // EXPANDED DUMP

    // Debug: Check for mismatch
    const matchingOwner = allDump.filter(p => p.ownerId === userId);
    console.log(`Dexie: Projects matching owner '${userId}': ${matchingOwner.length}`);

    const projects = await db.projects
      .where('ownerId')
      .equals(userId)
      .reverse()
      .sortBy('updatedAt');
    console.log(`Dexie: Loaded ${projects.length} projects for user ${userId}`, projects);
    return projects;
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
