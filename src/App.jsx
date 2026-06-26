import { useState, useEffect } from 'react';
import { useStore } from './store/store';
import { db } from './db/db';
import { Settings, CloudSync, Map, Activity, List, Trash2, Download, BarChart } from 'lucide-react';
import SetupTab from './components/SetupTab';
import PlotTab from './components/PlotTab';
import FieldGrid from './components/FieldGrid';
import TraitTab from './components/TraitTab';
import ProgressTab from './components/ProgressTab';
import './App.css';

function App() {
  const { activeWorkspaceId, setActiveWorkspace, setTrialData } = useStore();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeTab, setActiveTab] = useState('setup'); // setup, plot, trait, grid, heatmap

  // Load workspaces from Dexie on mount
  const loadWorkspaces = async () => {
    const wss = await db.workspaces.toArray();
    setWorkspaces(wss);
    if (wss.length > 0 && !activeWorkspaceId) {
      setActiveWorkspace(wss[0].id);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, [activeWorkspaceId, setActiveWorkspace]);

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspaceId) return;
    const wsName = workspaces.find(w => w.id === activeWorkspaceId)?.name || 'this workspace';
    
    if (window.confirm(`Are you absolutely sure you want to delete "${wsName}"? All associated plots and scores will be permanently deleted.`)) {
      await db.workspaces.delete(activeWorkspaceId);
      // Optional: Delete scores/photos associated with it
      // await db.scores.where({ workspaceId: activeWorkspaceId }).delete();
      
      setActiveWorkspace(null);
      setTrialData([]);
      loadWorkspaces();
      setActiveTab('setup');
    }
  };

  const handleCloudSync = async () => {
    if (!activeWorkspaceId) return;
    const ws = workspaces.find(w => w.id === activeWorkspaceId);
    if (!ws) return;
    const { trialData, traits } = useStore.getState();
    const wsName = ws.name || 'Workspace';

    try {
      const dbScores = await db.scores.where({ workspaceId: activeWorkspaceId }).toArray();
      
      // Flatten scores to match old V1 structure: { plotId: { traitName: "value" } }
      const flattenedScores = {};
      trialData.forEach(plot => {
        const pId = String(plot[ws.colMap.plot]);
        flattenedScores[pId] = {};
        
        traits.forEach(t => {
          const matchingScores = dbScores.filter(s => s.plotId === pId && s.trait === t.name);
          if (matchingScores.length > 0) {
            flattenedScores[pId][t.name] = {
              value: matchingScores.map(s => s.value).join(' ; '),
              timestamp: Math.max(...matchingScores.map(s => s.timestamp || 0))
            };
          } else {
            flattenedScores[pId][t.name] = { value: '', timestamp: 0 };
          }
        });
      });

      const allPhotos = await db.photos.where({ workspaceId: activeWorkspaceId }).toArray();
      const groupedPhotos = {};
      allPhotos.forEach(p => {
        const key = `${wsName}_${p.plotId}`;
        if (!groupedPhotos[key]) groupedPhotos[key] = [];
        groupedPhotos[key].push(p.dataUrl);
      });

      const payload = {
        workspace: wsName,
        data: trialData,
        scores: flattenedScores,
        traits: traits.map(t => t.name),
        photos: groupedPhotos,
        plotCol: ws.colMap.plot
      };

      const GAS_URL = "https://script.google.com/macros/s/AKfycbwkJZx5sNojar_Z10glpIp3aSX_C2cUUKm6MUtuHnEPzKY4hwcI09nQGVAI-2r6zj_e/exec";

      const response = await fetch(GAS_URL, {
        redirect: "follow",
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      let responseText = "";
      try {
        responseText = await response.text();
        const result = JSON.parse(responseText);

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}: ${result.message || response.statusText}`);
        }

        if (result.status === 'success') {
          alert("✅ Data successfully synced to your Google Sheet!");
        } else {
          throw new Error(result.message || 'Unknown error from backend');
        }
      } catch (parseError) {
        if (parseError.name === 'SyntaxError') {
          throw new Error(`Backend returned invalid data (Status: ${response.status}). \nRaw response: ${responseText.substring(0, 150)}...`);
        }
        throw parseError;
      }
    } catch (err) {
      alert("❌ Sync failed.\n\nError: " + err.message + "\n\nPlease check your internet connection or verify the backend service.");
    }
  };

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="app-header glassmorphism">
        <div className="header-brand">
          <div className="logo-icon">🌱</div>
          <h1>Field Data App</h1>
        </div>
        
        <div className="header-controls">
          <select 
            className="workspace-selector modern-input"
            value={activeWorkspaceId || ''}
            onChange={(e) => setActiveWorkspace(e.target.value)}
          >
            <option value="" disabled>Select Workspace...</option>
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
          {activeWorkspaceId && (
            <>
              <button className="icon-btn" title="Delete Workspace" onClick={handleDeleteWorkspace} style={{ color: '#ef4444' }}>
                <Trash2 size={20} />
              </button>
              <button className="icon-btn" title="Export Data to CSV" onClick={async () => {
                const { trialData, colMap, traits } = useStore.getState();
                const ws = workspaces.find(w => w.id === activeWorkspaceId);
                const wsName = ws?.name || 'Workspace';
                
                const scores = await db.scores.where({ workspaceId: activeWorkspaceId }).toArray();
                const photos = await db.photos.where({ workspaceId: activeWorkspaceId }).toArray();
                
                // Calculate max observations for dynamic raw columns
                const maxObs = {};
                traits.forEach(t => maxObs[t.name] = 1);
                
                const plotScoresMap = {};
                scores.forEach(s => {
                  if (!plotScoresMap[s.plotId]) plotScoresMap[s.plotId] = {};
                  if (typeof s.value === 'string' && s.value.includes(';')) {
                    const count = s.value.split(';').length;
                    if (count > maxObs[s.trait]) maxObs[s.trait] = count;
                  }
                  plotScoresMap[s.plotId][s.trait] = s.value;
                });
                
                const plotPhotosMap = {};
                photos.forEach(p => {
                  if (!plotPhotosMap[p.plotId]) plotPhotosMap[p.plotId] = 0;
                  plotPhotosMap[p.plotId]++;
                });

                const exportedData = trialData.map(plot => {
                  const pId = String(plot[colMap.plot]);
                  const merged = { Workspace: wsName, ...plot };
                  const pScores = plotScoresMap[pId] || {};
                  
                  // 1. Mean Columns
                  traits.forEach(t => {
                    const rawValue = pScores[t.name] || '';
                    if (typeof rawValue === 'string' && rawValue.includes(';')) {
                      const parts = rawValue.split(';');
                      let sum = 0;
                      let validCount = 0;
                      parts.forEach(pStr => {
                        const parsedNum = parseFloat(pStr.trim());
                        if (!isNaN(parsedNum)) {
                          sum += parsedNum;
                          validCount++;
                        }
                      });
                      merged[`${t.name} (Mean)`] = validCount > 0 ? (sum / validCount) : "";
                    } else {
                      merged[`${t.name} (Mean)`] = rawValue;
                    }
                  });
                  
                  // 2. Photos & Timestamp
                  const photoCount = plotPhotosMap[pId] || 0;
                  merged['Photo_Link'] = photoCount > 0 ? `${photoCount} photos in cloud` : "No Photo";
                  merged['Sync_Timestamp'] = new Date().toISOString();
                  
                  // 3. Raw Columns (if sub-samples exist)
                  traits.forEach(t => {
                    if (maxObs[t.name] > 1) {
                      const rawValue = pScores[t.name] || '';
                      const parts = typeof rawValue === 'string' ? rawValue.split(';') : [rawValue];
                      for (let k = 1; k <= maxObs[t.name]; k++) {
                        merged[`${t.name}_Raw_${k}`] = parts[k-1] ? parts[k-1].trim() : "";
                      }
                    }
                  });
                  
                  return merged;
                });

                import('papaparse').then(Papa => {
                  const csv = Papa.unparse(exportedData);
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `${wsName}_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                });
              }}>
                <Download size={20} />
              </button>
              <button className="icon-btn" title="Sync to Google Sheets" onClick={handleCloudSync}><CloudSync size={20} /></button>
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="app-main">
        {activeTab === 'setup' && <SetupTab />}
        {activeTab === 'plot' && <PlotTab />}
        {activeTab === 'trait' && <TraitTab />}
        {activeTab === 'grid' && <FieldGrid />}
        {activeTab === 'progress' && <ProgressTab />}
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="bottom-nav glassmorphism">
        <button className={`nav-item ${activeTab === 'setup' ? 'active' : ''}`} onClick={() => setActiveTab('setup')}>
          <Settings size={22} />
          <span>Setup</span>
        </button>
        <button className={`nav-item ${activeTab === 'plot' ? 'active' : ''}`} onClick={() => setActiveTab('plot')}>
          <List size={22} />
          <span>By Plot</span>
        </button>
        <button className={`nav-item ${activeTab === 'trait' ? 'active' : ''}`} onClick={() => setActiveTab('trait')}>
          <Activity size={22} />
          <span>By Trait</span>
        </button>
        <button className={`nav-item ${activeTab === 'grid' ? 'active' : ''}`} onClick={() => setActiveTab('grid')}>
          <Map size={22} />
          <span>Grid Map</span>
        </button>
        <button className={`nav-item ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => setActiveTab('progress')}>
          <BarChart size={22} />
          <span>Progress</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
