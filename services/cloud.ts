
import { AnnotationProject, User, DrawingPath, TextAnnotation } from "../types";

const CHANNEL_NAME = 'webmark_pro_sync';
const syncChannel = new BroadcastChannel(CHANNEL_NAME);

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Rivera', email: 'alex@example.com', avatar: 'https://i.pravatar.cc/150?u=u1', color: '#6366f1' },
  { id: 'u2', name: 'Jordan Lee', email: 'jordan@example.com', avatar: 'https://i.pravatar.cc/150?u=u2', color: '#f59e0b' },
  { id: 'u3', name: 'Sam Chen', email: 'sam@example.com', avatar: 'https://i.pravatar.cc/150?u=u3', color: '#10b981' },
];

export const broadcastUpdate = (projectId: string, payload: any) => {
  syncChannel.postMessage({ projectId, ...payload });
};

export const subscribeToUpdates = (callback: (data: any) => void) => {
  const handler = (event: MessageEvent) => callback(event.data);
  syncChannel.addEventListener('message', handler);
  return () => syncChannel.removeEventListener('message', handler);
};

export const saveToCloud = async (project: AnnotationProject): Promise<boolean> => {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));
  const projects = JSON.parse(localStorage.getItem('webmark_cloud_storage') || '[]');
  const index = projects.findIndex((p: any) => p.id === project.id);
  
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  
  localStorage.setItem('webmark_cloud_storage', JSON.stringify(projects));
  return true;
};

export const loadFromCloud = async (userId: string): Promise<AnnotationProject[]> => {
  const data = localStorage.getItem('webmark_cloud_storage');
  if (!data) return [];
  const allProjects: AnnotationProject[] = JSON.parse(data);
  // Return projects owned by user or where they are a collaborator
  return allProjects.filter(p => 
    p.ownerId === userId || p.collaborators.some(c => c.userId === userId)
  );
};
