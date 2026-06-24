import React, { useMemo } from 'react';
import { useStore } from '../store/store';

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 60 + (Math.abs(hash) % 30); // 60-90%
  const l = 40 + (Math.abs(hash) % 30); // 40-70%
  const textColor = l < 55 ? '#ffffff' : '#000000';
  return { bg: `hsl(${h}, ${s}%, ${l}%)`, text: textColor };
}

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

    let maxRow = -Infinity;
    let maxCol = -Infinity;
    let minRow = Infinity;
    let minCol = Infinity;
    const genotypes = new Set();

    const parsedData = trialData.map(d => {
      const r = parseInt(d[rowKey], 10);
      const c = parseInt(d[colKey], 10);
      const geno = String(d[genoKey] || 'Unknown');
      
      if (!isNaN(r)) {
        if (r > maxRow) maxRow = r;
        if (r < minRow) minRow = r;
      }
      if (!isNaN(c)) {
        if (c > maxCol) maxCol = c;
        if (c < minCol) minCol = c;
      }
      if (geno) genotypes.add(geno);
      
      return { ...d, _r: r, _c: c, _p: String(d[plotKey] || ''), _g: geno };
    }).filter(d => !isNaN(d._r) && !isNaN(d._c));

    if (minRow === Infinity || minCol === Infinity) {
      return { error: 'Row and Column data must contain valid numbers.' };
    }

    const uniqueGenotypes = Array.from(genotypes).sort();
    const colorMap = {};
    uniqueGenotypes.forEach((g) => {
      colorMap[g] = stringToColor(g);
    });

    const grid = [];
    for (let r = maxRow; r >= minRow; r--) {
      const rowArr = [];
      for (let c = minCol; c <= maxCol; c++) {
        const plot = parsedData.find(p => p._r === r && p._c === c);
        rowArr.push({
          r, c, plot,
          colors: plot ? colorMap[plot._g] : { bg: '#f1f5f9', text: '#000000' }
        });
      }
      grid.push({ rowIndex: r, cols: rowArr });
    }

    return { grid, maxRow, maxCol, minRow, minCol };
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
             {Array.from({ length: gridData.maxCol - gridData.minCol + 1 }).map((_, i) => {
               const actualCol = gridData.minCol + i;
               return (
                 <div key={`cf-${actualCol}`} style={{ width: '100px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: '#fff', color: '#000' }}>
                   <div style={{ transform: 'rotate(-45deg)', transformOrigin: 'center' }}>
                     Col {actualCol}
                   </div>
                 </div>
               );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}
