import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { db } from '../db/db';
import { QrCode, Search } from 'lucide-react';
import QRScanner from './QRScanner';
import VoiceDictation from './VoiceDictation';
import ScoreInput from './ScoreInput';
import PhotoCapture from './PhotoCapture';

export default function PlotTab() {
  const { activeWorkspaceId, workspaces, trialData, colMap, traits } = useStore();
  const [currentPlotIndex, setCurrentPlotIndex] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [plotScores, setPlotScores] = useState({}); // Local state for the current plot's scores

  useEffect(() => {
    setPlotScores({});
    if (!activeWorkspaceId || trialData.length === 0 || !colMap.plot) return;
    
    const loadScores = async () => {
      const pId = String(trialData[currentPlotIndex][colMap.plot]);
      try {
        const scores = await db.scores.where({ workspaceId: activeWorkspaceId, plotId: pId }).toArray();
        const scoreMap = {};
        scores.forEach(s => {
          scoreMap[s.trait] = s.value;
        });
        setPlotScores(scoreMap);
      } catch (err) {
        console.error("Failed to load scores", err);
      }
    };
    
    loadScores();
  }, [currentPlotIndex, activeWorkspaceId, colMap, trialData]);

  if (trialData.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>No trial data found. Please upload a map in the Setup tab.</div>;
  }

  const currentPlot = trialData[currentPlotIndex];
  const plotIdStr = currentPlot[colMap.plot] ? String(currentPlot[colMap.plot]) : `Row ${currentPlotIndex + 1}`;

  const handleScanSuccess = (decodedText) => {
    setShowScanner(false);
    jumpToExactMatch(decodedText);
  };

  const [searchBy, setSearchBy] = useState('plot');

  const jumpToExactMatch = (term) => {
    if (!term) return;
    const lowerTerm = String(term).toLowerCase().trim();
    
    let index = -1;
    if (searchBy === 'plot' && colMap.plot) {
      index = trialData.findIndex(row => String(row[colMap.plot]).toLowerCase() === lowerTerm);
    } else if (searchBy === 'geno' && colMap.geno) {
      index = trialData.findIndex(row => String(row[colMap.geno]).toLowerCase() === lowerTerm);
    }
    
    if (index !== -1) {
      setCurrentPlotIndex(index);
    } else {
      alert(`Could not find ${searchBy === 'plot' ? 'plot' : 'genotype'} matching: ${term}`);
    }
  };

  const handleVoiceDictation = (text) => {
    const lowerText = text.toLowerCase();
    
    // Quick number word to digit converter
    const numberWords = { 'zero':0, 'one':1, 'two':2, 'three':3, 'four':4, 'five':5, 'six':6, 'seven':7, 'eight':8, 'nine':9, 'ten':10 };
    let parsedText = lowerText;
    for (const [word, digit] of Object.entries(numberWords)) {
      parsedText = parsedText.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
    }

    // Try to find if user said "plot X"
    const plotMatch = parsedText.match(/plot\s+(\w+)/);
    if (plotMatch) {
      // Voice always searches by plot
      const term = plotMatch[1];
      const index = trialData.findIndex(row => colMap.plot && String(row[colMap.plot]).toLowerCase() === term);
      if (index !== -1) setCurrentPlotIndex(index);
    }

    // Try to find a trait match and a number following it
    let matchedTrait = null;
    let matchedValue = null;

    for (const trait of traits) {
      const traitName = trait.name.toLowerCase();
      const traitIndex = parsedText.indexOf(traitName);
      if (traitIndex !== -1) {
        const afterTrait = parsedText.slice(traitIndex + traitName.length);
        const numMatch = afterTrait.match(/\d+(\.\d+)?/);
        if (numMatch) {
          matchedTrait = trait.name;
          matchedValue = numMatch[0];
          break;
        }
      }
    }

    if (matchedTrait && matchedValue) {
      setPlotScores(prev => ({ ...prev, [matchedTrait]: matchedValue }));
    } else {
      alert(`Voice recognized: "${text}" but could not extract trait and value.`);
    }
  };

  const updateScore = async (traitName, val) => {
    setPlotScores(prev => ({ ...prev, [traitName]: val }));
    
    // Save to Dexie DB
    if (!activeWorkspaceId) return;
    const pId = String(currentPlot[colMap.plot]);
    
    try {
      const timestamp = Date.now();
      // Check if a score for this plot and trait already exists to update it, or create a new one
      const existing = await db.scores.where({ workspaceId: activeWorkspaceId, plotId: pId, trait: traitName }).first();
      
      if (existing) {
        await db.scores.update(existing.id, { value: val, timestamp });
      } else {
        await db.scores.add({
          id: crypto.randomUUID(),
          workspaceId: activeWorkspaceId,
          plotId: pId,
          trait: traitName,
          value: val,
          timestamp
        });
      }
    } catch (err) {
      console.error("Failed to save score to DB", err);
    }
  };

  return (
    <div className="tab-panel active-panel fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>Score by Plot</h2>
        <button onClick={() => setShowScanner(true)} className="icon-btn" style={{ background: '#0ea5e9', color: 'white' }}>
          <QrCode size={20} />
        </button>
      </div>

      {showScanner && <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <select 
          className="modern-input"
          value={searchBy}
          onChange={(e) => setSearchBy(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9' }}
        >
          <option value="plot">Plot</option>
          <option value="geno">Geno</option>
        </select>
        <input 
          type="text" 
          placeholder={`Search ${searchBy === 'plot' ? 'Plot' : 'Genotype'}...`}
          className="modern-input" 
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && jumpToExactMatch(searchTerm)}
        />
        <button onClick={() => jumpToExactMatch(searchTerm)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0 16px', borderRadius: '8px', cursor: 'pointer' }}>
          <Search size={18} color="#475569" />
        </button>
      </div>

      <div className="modern-card" style={{ padding: '16px', marginBottom: '16px', background: '#f8fafc' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#0ea5e9', fontSize: '20px' }}>Plot: {plotIdStr}</h3>
        {colMap.geno && currentPlot[colMap.geno] && (
          <div style={{ color: '#22c55e', fontWeight: 'bold' }}>Genotype: {currentPlot[colMap.geno]}</div>
        )}
      </div>

      {/* Voice Dictation Hub */}
      <VoiceDictation onDictationResult={handleVoiceDictation} />

      {/* Photo Capture Hub */}
      <PhotoCapture plotId={plotIdStr} />

      {/* Trait Inputs */}
      <div className="modern-card" style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#334155' }}>Enter Data</h3>
        {traits.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '14px' }}>No traits defined. Go to Setup tab.</p>
        ) : (
          traits.map((trait, idx) => (
            <ScoreInput 
              key={idx} 
              trait={trait} 
              value={plotScores[trait.name] || ''} 
              onChange={(val) => updateScore(trait.name, val)} 
            />
          ))
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button 
          onClick={() => setCurrentPlotIndex(Math.max(0, currentPlotIndex - 1))}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Previous
        </button>
        <button 
          onClick={() => setCurrentPlotIndex(Math.min(trialData.length - 1, currentPlotIndex + 1))}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#0ea5e9', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
