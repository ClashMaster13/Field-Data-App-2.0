import React, { useMemo } from 'react';
import { useStore } from '../store/store';

const PALETTE = [
  { bg: '#1f77b4', text: '#ffffff' }, // blue
  { bg: '#ff7f0e', text: '#000000' }, // orange
  { bg: '#98df8a', text: '#000000' }, // light green
  { bg: '#ff9896', text: '#000000' }, // pinkish
  { bg: '#8c564b', text: '#ffffff' }, // brown
  { bg: '#e377c2', text: '#000000' }, // pink/purple
  { bg: '#c7c7c7', text: '#000000' }, // gray
  { bg: '#dbdb8d', text: '#000000' }, // yellow-green
  { bg: '#9edae5', text: '#000000' }, // light blue
  { bg: '#2ca02c', text: '#ffffff' },
  { bg: '#d62728', text: '#ffffff' },
  { bg: '#9467bd', text: '#ffffff' },
  { bg: '#17becf', text: '#000000' }
];

export default function GridTab() {
  const { trialData, colMap } = useStore();

  const gridData = useMemo(() => {
    if (!trialData || trialData.length === 0) return null;

    let rowKey = colMap?.row;
    let colKey = colMap?.col;
    let plotKey = colMap?.plot;
    let genoKey = colMap?.geno;

    const keys = Object.keys(trialData[0]);
    if (!rowKey) rowKey = keys.find(k => k.toLowerCase() === 'row' || k.toLowerCase() === 'range');
    if (!colKey) colKey = keys.find(k => k.toLowerCase() === 'col' || k.toLowerCase() === 'column' || k.toLowerCase() === 'pass');
    if (!plotKey) plotKey = keys.find(k => k.toLowerCase() === 'plot' || k.toLowerCase() === 'plot_id');
    if (!genoKey) genoKey = keys.find(k => k.toLowerCase() === 'genotype' || k.toLowerCase() === 'entry');

    if (!rowKey || !colKey) {
      return { error: 'Your CSV must contain mapped "Row" and "Column" headers to generate the 2D map.' };
    }

    let maxRow = 0;
    let maxCol = 0;
    const genotypes = new Set();

    const parsedData = trialData.map(d => {
      const r = parseInt(d[rowKey], 10);
      const c = parseInt(d[colKey], 10);
      const geno = String(d[genoKey] || 'Unknown');
      
      if (r > maxRow) maxRow = r;
      if (c > maxCol) maxCol = c;
      if (geno) genotypes.add(geno);
      
      return { ...d, _r: r, _c: c, _p: String(d[plotKey] || ''), _g: geno };
    }).filter(d => !isNaN(d._r) && !isNaN(d._c));

    const uniqueGenotypes = Array.from(genotypes).sort();
    const colorMap = {};
    uniqueGenotypes.forEach((g, idx) => {
      colorMap[g] = PALETTE[idx % PALETTE.length];
    });

    const grid = [];
    for (let r = maxRow; r >= 1; r--) {
      const rowArr = [];
      for (let c = 1; c <= maxCol; c++) {
        const plot = parsedData.find(p => p._r === r && p._c === c);
        rowArr.push({
          r, c, plot,
          colors: plot ? colorMap[plot._g] : { bg: '#ffffff', text: '#000000' }
        });
      }
      grid.push({ rowIndex: r, cols: rowArr });
    }

    return { grid, maxRow, maxCol };
  }, [trialData, colMap]);

  if (!gridData) return <div style={{ padding: '20px' }}>No data.</div>;
  
  if (gridData.error) {
    return (
      <div className="tab-panel active-panel fade-in">
        <h2>Grid Map</h2>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px', color: '#b91c1c' }}>
          <strong>Missing Spatial Data:</strong> {gridData.error}
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel active-panel fade-in" style={{ paddingBottom: '100px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Color-Coded Field Layout Map</h2>
      <p className="text-muted" style={{ textAlign: 'center', marginBottom: '24px' }}>
        Row 1 starts at the bottom. Colors indicate the Genotype.
      </p>

      <div style={{ overflowX: 'auto', paddingBottom: '20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 'min-content', border: '1.5px solid #000', width: 'max-content', background: '#fff' }}>
          {gridData.grid.map((rowObj) => (
            <div key={`r-${rowObj.rowIndex}`} style={{ display: 'flex' }}>
              <div style={{ width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', background: '#fff', color: '#000' }}>
                Row {rowObj.rowIndex}
              </div>
              {rowObj.cols.map((cell) => (
                <div 
                  key={`c-${cell.c}`} 
                  style={{
                    width: '100px',
                    height: '90px',
                    background: cell.plot ? cell.colors.bg : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: cell.plot ? cell.colors.text : '#000',
                    textAlign: 'center',
                    padding: '4px',
                    boxSizing: 'border-box'
                  }}
                  title={cell.plot ? `Plot: ${cell.plot._p}\nGeno: ${cell.plot._g}` : 'Empty'}
                >
                  {cell.plot ? (
                    <>
                      <div>P{cell.plot._p}</div>
                      <div>{cell.plot._g}</div>
                    </>
                  ) : ''}
                </div>
              ))}
            </div>
          ))}
          {/* Column footers */}
          <div style={{ display: 'flex' }}>
             <div style={{ width: '60px', background: '#fff' }}></div>
             {Array.from({ length: gridData.maxCol }).map((_, i) => (
               <div key={`cf-${i}`} style={{ width: '100px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: '#fff', color: '#000' }}>
                 <div style={{ transform: 'rotate(-45deg)', transformOrigin: 'center' }}>
                   Col {i + 1}
                 </div>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
