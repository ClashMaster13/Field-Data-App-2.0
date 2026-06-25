import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { db } from '../db/db';

export default function ProgressTab() {
  const { activeWorkspaceId, traits, trialData, colMap } = useStore();
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspaceId || trialData.length === 0 || !colMap.plot) {
      setLoading(false);
      return;
    }

    const loadProgress = async () => {
      try {
        const allScores = await db.scores.where({ workspaceId: activeWorkspaceId }).toArray();
        
        // Get all valid plot IDs from the trial data
        const validPlots = trialData
          .map(d => String(d[colMap.plot] || '').trim())
          .filter(pId => pId !== '');

        const totalPlots = validPlots.length;
        if (totalPlots === 0) {
          setLoading(false);
          return;
        }

        const progress = traits.map(trait => {
          // Find all unique plot IDs that have a non-empty score for this trait
          const scoredPlotIds = new Set(
            allScores
              .filter(s => s.trait === trait.name && s.value !== '' && s.value !== null)
              .map(s => s.plotId)
          );

          const scoredCount = scoredPlotIds.size;
          const missingPlots = validPlots.filter(pId => !scoredPlotIds.has(pId));
          const percentage = Math.round((scoredCount / totalPlots) * 100);

          return {
            traitName: trait.name,
            totalPlots,
            scoredCount,
            percentage,
            missingPlots
          };
        });

        setProgressData(progress);
      } catch (err) {
        console.error("Failed to load progress data", err);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [activeWorkspaceId, traits, trialData, colMap]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading progress...</div>;
  }

  if (trialData.length === 0 || traits.length === 0) {
    return (
      <div className="tab-panel active-panel fade-in" style={{ padding: '20px', textAlign: 'center' }}>
        <p className="text-muted">No data available to show progress. Please map your data and define traits in Setup.</p>
      </div>
    );
  }

  return (
    <div className="tab-panel active-panel fade-in" style={{ paddingBottom: '100px' }}>
      <h2>Data Collection Progress</h2>
      <p className="text-muted" style={{ marginBottom: '24px' }}>Track your scoring progress across all defined traits.</p>

      {progressData.map((data, idx) => {
        // Dynamic colors based on progress
        let barColor = '#ef4444'; // Red for < 30%
        if (data.percentage >= 100) barColor = '#22c55e'; // Green for 100%
        else if (data.percentage >= 70) barColor = '#84cc16'; // Yellow-Green
        else if (data.percentage >= 30) barColor = '#eab308'; // Yellow

        return (
          <div key={idx} className="modern-card" style={{ marginBottom: '16px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>{data.traitName}</h3>
              <span style={{ fontWeight: 'bold', color: barColor }}>{data.percentage}%</span>
            </div>
            
            {/* Background Bar */}
            <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
              {/* Foreground Bar */}
              <div 
                style={{ 
                  width: `${data.percentage}%`, 
                  height: '100%', 
                  background: barColor, 
                  transition: 'width 0.5s ease-in-out'
                }} 
              />
            </div>
            
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: data.missingPlots.length > 0 ? '12px' : '0' }}>
              <strong>{data.scoredCount}</strong> out of <strong>{data.totalPlots}</strong> plots scored
            </div>

            {data.missingPlots.length > 0 && (
              <details style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#0f172a' }}>
                  View Missing Plots ({data.missingPlots.length})
                </summary>
                <div style={{ marginTop: '10px', color: '#475569', lineHeight: '1.5', maxHeight: '150px', overflowY: 'auto' }}>
                  {data.missingPlots.join(', ')}
                </div>
              </details>
            )}
            
            {data.percentage === 100 && (
              <div style={{ color: '#15803d', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✅ All plots scored for this trait!
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
