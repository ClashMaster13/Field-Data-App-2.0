import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { db } from '../db/db';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
        const allScores = await db.scores
          .where('workspaceId')
          .equals(activeWorkspaceId)
          .toArray();
        
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
          // Find all scores for this trait that are non-empty
          const traitScores = allScores.filter(s => s.trait === trait.name && s.value !== '' && s.value !== null);
          
          const scoredPlotIds = new Set(traitScores.map(s => s.plotId));
          const scoredCount = scoredPlotIds.size;
          const missingPlots = validPlots.filter(pId => !scoredPlotIds.has(pId));
          const percentage = Math.round((scoredCount / totalPlots) * 100);

          let distribution = null;

          // Generate Distribution (Histogram) for numeric traits
          if ((trait.type === 'integer' || trait.type === 'decimal') && traitScores.length > 0) {
            const numericValues = traitScores
              .map(s => parseFloat(s.value))
              .filter(v => !isNaN(v));

            if (numericValues.length > 0) {
              const minVal = Math.min(...numericValues);
              const maxVal = Math.max(...numericValues);
              
              const binCount = 10;
              const bins = [];
              
              if (maxVal === minVal) {
                // All values are exactly the same
                bins.push({
                  range: `${minVal}`,
                  count: numericValues.length
                });
              } else {
                const binWidth = (maxVal - minVal) / binCount;
                for (let i = 0; i < binCount; i++) {
                  const binStart = minVal + (i * binWidth);
                  const binEnd = i === binCount - 1 ? maxVal : binStart + binWidth;
                  
                  // Format numbers to look clean (e.g., max 2 decimal places)
                  const formatNum = (num) => Number.isInteger(num) ? num : num.toFixed(2);
                  
                  bins.push({
                    binStart,
                    binEnd,
                    range: `${formatNum(binStart)} - ${formatNum(binEnd)}`,
                    count: 0
                  });
                }

                numericValues.forEach(val => {
                  for (let i = 0; i < binCount; i++) {
                    // Put in bin if it falls in range. Last bin is inclusive of maxVal.
                    if (val >= bins[i].binStart && (i === binCount - 1 ? val <= bins[i].binEnd : val < bins[i].binEnd)) {
                      bins[i].count++;
                      break;
                    }
                  }
                });
              }
              distribution = bins;
            }
          }

          return {
            traitName: trait.name,
            totalPlots,
            scoredCount,
            percentage,
            missingPlots,
            distribution
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
      <p className="text-muted" style={{ marginBottom: '24px' }}>Track your scoring progress and view data distribution across traits.</p>

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
            
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: (data.missingPlots.length > 0 || data.distribution) ? '12px' : '0' }}>
              <strong>{data.scoredCount}</strong> out of <strong>{data.totalPlots}</strong> plots scored
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {data.missingPlots.length > 0 && (
                <details style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', flex: 1, minWidth: '250px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#0f172a' }}>
                    View Missing Plots ({data.missingPlots.length})
                  </summary>
                  <div style={{ marginTop: '10px', color: '#475569', lineHeight: '1.5', maxHeight: '150px', overflowY: 'auto' }}>
                    {data.missingPlots.join(', ')}
                  </div>
                </details>
              )}

              {data.distribution && (
                <details style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', flex: 1, minWidth: '300px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#0369a1' }}>
                    View Data Distribution (Histogram)
                  </summary>
                  <div style={{ marginTop: '16px', height: '200px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="range" 
                          tick={{ fontSize: 11, fill: '#64748b' }} 
                          angle={-25} 
                          textAnchor="end" 
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                        <Tooltip 
                          cursor={{ fill: '#f1f5f9' }}
                          contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Plots" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </details>
              )}
            </div>
            
            {data.percentage === 100 && (
              <div style={{ color: '#15803d', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                ✅ All plots scored for this trait!
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
