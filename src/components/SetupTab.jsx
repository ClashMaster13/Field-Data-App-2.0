import React, { useState } from 'react';
import Papa from 'papaparse';
import { useStore } from '../store/store';
import { db } from '../db/db';
import { Upload, CheckCircle, Save } from 'lucide-react';
import TraitSetup from './TraitSetup';

export default function SetupTab() {
  const { activeWorkspaceId, setActiveWorkspace, setTrialData, setColMap } = useStore();
  const [loading, setLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  // Staging state
  const [stagedData, setStagedData] = useState(null);
  const [availableHeaders, setAvailableHeaders] = useState([]);
    plot: '',
    geno: '',
    trial: '',
    location: '',
    year: '',
    row: '',
    col: '',
    rep: '',
    pedigree: ''
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: async (results) => {
        let rawData = results.data;
        const cleanedData = rawData.map(row => {
          const newRow = {};
          for (let key in row) {
            newRow[key.trim()] = row[key];
          }
          return newRow;
        });

        const keys = Object.keys(cleanedData[0] || {});
        setAvailableHeaders(keys);
        setStagedData(cleanedData);

        // Auto-detect to pre-fill mapping dropdowns
        let pCol = keys.find(k => k.toLowerCase() === 'plot' || k.toLowerCase() === 'plot_id' || k.toLowerCase() === 'plotid' || k.toLowerCase() === 'id');
        let gCol = keys.find(k => k.toLowerCase() === 'genotype' || k.toLowerCase() === 'entry' || k.toLowerCase() === 'variety' || k.toLowerCase() === 'pedigree');
        let tCol = keys.find(k => k.toLowerCase() === 'trial' || k.toLowerCase() === 'experiment' || k.toLowerCase() === 'trial type');
        let locCol = keys.find(k => k.toLowerCase() === 'location' || k.toLowerCase() === 'site');
        let yrCol = keys.find(k => k.toLowerCase() === 'year' || k.toLowerCase() === 'site year');
        let rCol = keys.find(k => k.toLowerCase() === 'row' || k.toLowerCase() === 'range');
        let cCol = keys.find(k => k.toLowerCase() === 'col' || k.toLowerCase() === 'column' || k.toLowerCase() === 'pass');
        let repCol = keys.find(k => k.toLowerCase() === 'rep' || k.toLowerCase() === 'replication');
        let pedCol = keys.find(k => k.toLowerCase() === 'pedigree' || k.toLowerCase() === 'cross');

        setMapping({
          plot: pCol || '',
          geno: gCol || '',
          trial: tCol || '',
          location: locCol || '',
          year: yrCol || '',
          row: rCol || '',
          col: cCol || '',
          rep: repCol || '',
          pedigree: pedCol || ''
        });

        if (!workspaceName) {
          setWorkspaceName(file.name.replace('.csv', ''));
        }
        
        setLoading(false);
      },
      error: (err) => {
        setLoading(false);
        alert('Error parsing CSV: ' + err.message);
      }
    });
  };

  const confirmMappingAndCreate = async () => {
    if (!mapping.plot) {
      alert("Plot ID column must be mapped.");
      return;
    }

    setColMap(mapping);
    setTrialData(stagedData);

    const newName = workspaceName || 'New Workspace';
    const newWorkspace = {
      id: crypto.randomUUID(),
      name: newName,
      createdAt: new Date().getTime(),
      colMap: mapping
    };

    await db.workspaces.add(newWorkspace);
    setActiveWorkspace(newWorkspace.id);
    
    setStagedData(null); // clear staging
    alert(`Successfully imported ${stagedData.length} plots into workspace: ${newName}`);
  };

  return (
    <div className="tab-panel active-panel fade-in">
      <h2>Data Setup</h2>
      <p className="text-muted">Create a new workspace by uploading a Trial Map (CSV).</p>
      
      {!stagedData ? (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>Workspace Name (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. 2026 Wheat Trial" 
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              className="workspace-selector modern-input"
              style={{ width: '100%', maxWidth: '300px' }}
            />
          </div>

          <div className="upload-card modern-card">
            <Upload size={32} className="upload-icon" />
            <h3>Drop CSV Here</h3>
            <p>{loading ? 'Processing...' : 'or click to browse'}</p>
            <input type="file" accept=".csv" className="file-input" onChange={handleFileUpload} disabled={loading} />
          </div>

          {activeWorkspaceId && (
            <>
              <div style={{ marginTop: '24px', padding: '16px', background: '#ecfdf5', borderRadius: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={20} />
                <span>Active Workspace Ready. Setup traits below or navigate to <b>By Plot</b> to begin scoring.</span>
              </div>
              <TraitSetup />
            </>
          )}
        </>
      ) : (
        <div className="modern-card fade-in" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0ea5e9' }}>Map Your Columns</h3>
          <p className="text-muted" style={{ marginBottom: '20px' }}>
            We've extracted the headers from your CSV. Please map them to the correct fields below.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Plot Mapping */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Plot ID (Required) <span style={{color: 'red'}}>*</span></label>
              <select className="workspace-selector modern-input" style={{ width: '100%' }} value={mapping.plot} onChange={e => setMapping({...mapping, plot: e.target.value})}>
                <option value="">-- Select Column --</option>
                {availableHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {/* Genotype Mapping */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Genotype / Entry</label>
              <select className="workspace-selector modern-input" style={{ width: '100%' }} value={mapping.geno} onChange={e => setMapping({...mapping, geno: e.target.value})}>
                <option value="">-- Select Column --</option>
                {availableHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {/* Trial Mapping */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Trial Name / Type</label>
              <select className="workspace-selector modern-input" style={{ width: '100%' }} value={mapping.trial} onChange={e => setMapping({...mapping, trial: e.target.value})}>
                <option value="">-- Select Column --</option>
                {availableHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {/* Location Mapping */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Location / Site</label>
              <select className="workspace-selector modern-input" style={{ width: '100%' }} value={mapping.location} onChange={e => setMapping({...mapping, location: e.target.value})}>
                <option value="">-- Select Column --</option>
                {availableHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {/* Year Mapping */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Site Year</label>
              <select className="workspace-selector modern-input" style={{ width: '100%' }} value={mapping.year} onChange={e => setMapping({...mapping, year: e.target.value})}>
                <option value="">-- Select Column --</option>
                {availableHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {/* Pedigree Mapping */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Pedigree</label>
              <select className="workspace-selector modern-input" style={{ width: '100%' }} value={mapping.pedigree} onChange={e => setMapping({...mapping, pedigree: e.target.value})}>
                <option value="">-- Select Column --</option>
                {availableHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {/* Rep Mapping */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Replication (Rep)</label>
              <select className="workspace-selector modern-input" style={{ width: '100%' }} value={mapping.rep} onChange={e => setMapping({...mapping, rep: e.target.value})}>
                <option value="">-- Select Column --</option>
                {availableHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {/* Row Mapping */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Grid Row</label>
              <select className="workspace-selector modern-input" style={{ width: '100%' }} value={mapping.row} onChange={e => setMapping({...mapping, row: e.target.value})}>
                <option value="">-- Select Column --</option>
                {availableHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {/* Col Mapping */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Grid Column</label>
              <select className="workspace-selector modern-input" style={{ width: '100%' }} value={mapping.col} onChange={e => setMapping({...mapping, col: e.target.value})}>
                <option value="">-- Select Column --</option>
                {availableHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setStagedData(null)}
              style={{ padding: '10px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}
            >
              Cancel
            </button>
            <button 
              onClick={confirmMappingAndCreate}
              style={{ flex: 1, padding: '10px 16px', background: '#0ea5e9', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Save size={18} /> Confirm Mapping & Create Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
