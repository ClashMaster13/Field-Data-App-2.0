import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Multiply by a large float (like the golden ratio) to scatter hues wildly for similar hashes
  const h = Math.abs(Math.floor(hash * 137.508)) % 360;
  const s = 60 + (Math.abs(hash * 73) % 30); // 60-90%
  const l = 40 + (Math.abs(hash * 19) % 30); // 40-70%
  const textColor = l < 55 ? '#ffffff' : '#000000';
  return { bg: `hsl(${h}, ${s}%, ${l}%)`, text: textColor };
}

export default function GridTab() {
  const { trialData, colMap } = useStore();
  const [corner, setCorner] = useState('bottom-left');

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

    let parsedData = trialData.map(d => {
      const r = parseInt(d[rowKey], 10);
      const c = parseInt(d[colKey], 10);
      const pStr = String(d[plotKey] || '').trim();
      const gStr = String(d[genoKey] || 'Unknown').trim();
      return { ...d, _rawR: r, _rawC: c, _p: pStr, _g: gStr };
    }).filter(d => !isNaN(d._rawR) && !isNaN(d._rawC) && d._p !== '');

    parsedData.forEach(d => {
      if (d._rawR < minRow) minRow = d._rawR;
      if (d._rawC < minCol) minCol = d._rawC;
      if (d._g && d._g !== 'Unknown') genotypes.add(d._g);
    });

    if (minRow === Infinity || minCol === Infinity) {
      return { error: 'Row and Column data must contain valid numbers.' };
    }

    // Normalize so grid always starts at 1,1
    parsedData = parsedData.map(d => {
      const normR = d._rawR - minRow + 1;
      const normC = d._rawC - minCol + 1;
      if (normR > maxRow) maxRow = normR;
      if (normC > maxCol) maxCol = normC;
      return { ...d, _r: normR, _c: normC };
    });

    const uniqueGenotypes = Array.from(genotypes).sort();
    const colorMap = {};
    uniqueGenotypes.forEach((g) => {
      colorMap[g] = stringToColor(g);
    });

    const grid = [];
    
    // Determine row iteration order
    const isBottom = corner.includes('bottom');
    const isRight = corner.includes('right');
    
    const rowStart = isBottom ? maxRow : 1;
    const rowEnd = isBottom ? 1 : maxRow;
    const rowStep = isBottom ? -1 : 1;
    
    // Determine col iteration order
    const colStart = isRight ? maxCol : 1;
    const colEnd = isRight ? 1 : maxCol;
    const colStep = isRight ? -1 : 1;

    for (let r = rowStart; isBottom ? r >= rowEnd : r <= rowEnd; r += rowStep) {
      const rowArr = [];
      for (let c = colStart; isRight ? c >= colEnd : c <= colEnd; c += colStep) {
        const plot = parsedData.find(p => p._r === r && p._c === c);
        rowArr.push({
          r, c, plot,
          colors: plot ? colorMap[plot._g] : { bg: '#f1f5f9', text: '#000000' }
        });
      }
      grid.push({ rowIndex: r, cols: rowArr });
    }

    const colHeaders = [];
    for (let c = colStart; isRight ? c >= colEnd : c <= colEnd; c += colStep) {
       colHeaders.push(c);
    }

    return { grid, maxRow, maxCol, minRow, minCol, colHeaders };
  }, [trialData, colMap, corner]);

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
      
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
        <label style={{ fontWeight: '500' }}>Grid Starting Corner:</label>
        <select 
          value={corner} 
          onChange={e => setCorner(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
        >
          <option value="bottom-left">Bottom Left (Row 1 bottom, Col 1 left)</option>
          <option value="bottom-right">Bottom Right (Row 1 bottom, Col 1 right)</option>
          <option value="top-left">Top Left (Row 1 top, Col 1 left)</option>
          <option value="top-right">Top Right (Row 1 top, Col 1 right)</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '20px', display: 'flex', justifyContent: 'flex-start' }}>
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
             {gridData.colHeaders.map((c) => (
               <div key={`cf-${c}`} style={{ width: '100px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: '#fff', color: '#000' }}>
                 <div style={{ transform: 'rotate(-45deg)', transformOrigin: 'center' }}>
                   Col {c}
                 </div>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
