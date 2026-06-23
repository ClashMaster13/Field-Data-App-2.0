import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/store';
import { db } from '../db/db';
import { Search } from 'lucide-react';
import ScoreInput from './ScoreInput';

export default function TraitTab() {
  const { activeWorkspaceId, trialData, colMap, traits } = useStore();
  const [activeTrait, setActiveTrait] = useState(traits.length > 0 ? traits[0].name : '');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('plot');
  const [allScores, setAllScores] = useState({}); 
  const [displayLimit, setDisplayLimit] = useState(50);
  
  const observer = useRef();

  useEffect(() => {
    if (traits.length > 0 && !activeTrait) {
      setActiveTrait(traits[0].name);
    }
  }, [traits, activeTrait]);

  useEffect(() => {
    if (!activeWorkspaceId || !activeTrait) return;
    const loadScores = async () => {
      try {
        const scores = await db.scores.where({ workspaceId: activeWorkspaceId, trait: activeTrait }).toArray();
        const scoreMap = {};
        scores.forEach(s => {
          scoreMap[s.plotId] = s.value;
        });
        setAllScores(scoreMap);
      } catch (err) {
        console.error("Failed to load trait scores", err);
      }
    };
    loadScores();
  }, [activeWorkspaceId, activeTrait]);

  const updateScore = async (plotId, val) => {
    setAllScores(prev => ({ ...prev, [plotId]: val }));
    if (!activeWorkspaceId) return;
    try {
      const timestamp = Date.now();
      const existing = await db.scores.where({ workspaceId: activeWorkspaceId, plotId: String(plotId), trait: activeTrait }).first();
      if (existing) {
        await db.scores.update(existing.id, { value: val, timestamp });
      } else {
        await db.scores.add({
          id: crypto.randomUUID(),
          workspaceId: activeWorkspaceId,
          plotId: String(plotId),
          trait: activeTrait,
          value: val,
          timestamp
        });
      }
    } catch (err) {
      console.error("Failed to save score to DB", err);
    }
  };

  const handleJump = () => {
    if (!searchTerm) return;
    const term = searchTerm.toLowerCase();
    
    // Find exact match first, then fallback to startsWith
    let index = trialData.findIndex(plot => {
      const pId = String(plot[searchBy === 'plot' ? colMap.plot : colMap.geno] || '').toLowerCase();
      return pId === term;
    });

    if (index === -1) {
      index = trialData.findIndex(plot => {
        const pId = String(plot[searchBy === 'plot' ? colMap.plot : colMap.geno] || '').toLowerCase();
        return pId.startsWith(term);
      });
    }

    if (index !== -1) {
      if (index >= displayLimit) {
        setDisplayLimit(index + 20); // Render enough to show it
      }
      setTimeout(() => {
        const element = document.getElementById(`trait-plot-${index}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.transition = 'background-color 0.5s';
          element.style.backgroundColor = '#fef08a';
          setTimeout(() => {
            if (element) element.style.backgroundColor = 'transparent';
          }, 2000);
        }
      }, 100);
    } else {
      alert("No match found.");
    }
  };

  if (trialData.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>No trial data found. Please upload a map in the Setup tab.</div>;
  }

  if (traits.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>No traits defined. Go to Setup tab.</div>;
  }

  const selectedTraitObj = traits.find(t => t.name === activeTrait) || traits[0];

  const lastElementRef = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && displayLimit < trialData.length) {
        setDisplayLimit(prev => prev + 50);
      }
    });
    if (node) observer.current.observe(node);
  }, [displayLimit, trialData.length]);

  return (
    <div className="tab-panel active-panel fade-in" style={{ paddingBottom: '100px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2>Score by Trait</h2>
        <p className="text-muted" style={{ fontSize: '14px', margin: '4px 0 16px 0' }}>
          Select a trait to quickly score it across multiple plots.
        </p>
        <select 
          className="modern-input" 
          value={activeTrait} 
          onChange={(e) => setActiveTrait(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0ea5e9' }}
        >
          {traits.map(t => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>
      </div>

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
          placeholder={`Jump to ${searchBy === 'plot' ? 'Plot' : 'Genotype'}...`}
          className="modern-input" 
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleJump(); }}
        />
        <button 
          onClick={handleJump}
          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <Search size={18} color="#475569" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {trialData.slice(0, displayLimit).map((plot, idx) => {
          const plotId = String(plot[colMap.plot]);
          const genotype = plot[colMap.geno];
          
          if (idx === displayLimit - 1) {
            return (
              <div ref={lastElementRef} id={`trait-plot-${idx}`} key={idx} className="modern-card" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#334155' }}>Plot {plotId}</div>
                  {genotype && <div style={{ fontSize: '12px', color: '#64748b' }}>{genotype}</div>}
                </div>
                <div style={{ flex: 2 }}>
                  <ScoreInput trait={selectedTraitObj} value={allScores[plotId] || ''} onChange={(val) => updateScore(plotId, val)} />
                </div>
              </div>
            );
          } else {
            return (
              <div id={`trait-plot-${idx}`} key={idx} className="modern-card" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#334155' }}>Plot {plotId}</div>
                  {genotype && <div style={{ fontSize: '12px', color: '#64748b' }}>{genotype}</div>}
                </div>
                <div style={{ flex: 2 }}>
                  <ScoreInput trait={selectedTraitObj} value={allScores[plotId] || ''} onChange={(val) => updateScore(plotId, val)} />
                </div>
              </div>
            );
          }
        })}
        
        {displayLimit < trialData.length && (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '10px', padding: '10px' }}>
            Loading more plots...
          </div>
        )}
      </div>
    </div>
  );
}
