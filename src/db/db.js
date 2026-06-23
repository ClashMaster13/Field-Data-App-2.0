import Dexie from 'dexie';

export const db = new Dexie('FieldDataDB-v2');

// We use 'id' as primary key for photos and scores.
// workspaces uses 'id' (UUID) and 'name'
db.version(1).stores({
  workspaces: 'id, name, createdAt', // { id: 'ws1', name: 'Wheat_Trial_1', config: {...} }
  scores: 'id, workspaceId, plotId, trait, value, timestamp', // { id: 's1', workspaceId: 'ws1', plotId: '101', trait: 'Yield', value: 4.5, timestamp: 12345 }
  photos: 'id, workspaceId, plotId, dataUrl, timestamp'
});
