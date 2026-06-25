import React, { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { Download } from 'lucide-react';
import ExcelJS from 'exceljs';

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c/2,
      r = 0, g = 0, b = 0; 
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  return `FF${r}${g}${b}`.toUpperCase();
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(Math.floor(hash * 137.508)) % 360;
  const s = 60 + (Math.abs(hash * 73) % 30); 
  const l = 40 + (Math.abs(hash * 19) % 30); 
  const textColor = l < 55 ? '#ffffff' : '#000000';
  const argb = hslToHex(h, s, l);
  return { 
    bg: `hsl(${h}, ${s}%, ${l}%)`, 
    hex: argb, 
    text: textColor, 
    textHex: l < 55 ? 'FFFFFFFF' : 'FF000000' 
  };
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
    let trialKey = colMap?.trial;
    let repKey = colMap?.rep;

    const keys = Object.keys(trialData[0]);
    if (!rowKey) rowKey = keys.find(k => k.toLowerCase() === 'row' || k.toLowerCase() === 'range');
    if (!colKey) colKey = keys.find(k => k.toLowerCase() === 'col' || k.toLowerCase() === 'column' || k.toLowerCase() === 'pass');
    if (!plotKey) plotKey = keys.find(k => k.toLowerCase() === 'plot' || k.toLowerCase() === 'plot_id');
    if (!genoKey) genoKey = keys.find(k => k.toLowerCase() === 'genotype' || k.toLowerCase() === 'entry');
    if (!trialKey) trialKey = keys.find(k => k.toLowerCase().includes('trial'));
    if (!repKey) repKey = keys.find(k => k.toLowerCase() === 'rep' || k.toLowerCase() === 'replication');

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
      const tStr = String(d[trialKey] || '-').trim();
      const repStr = String(d[repKey] || '-').trim();
      
      return { ...d, _rawR: r, _rawC: c, _p: pStr, _g: gStr, _t: tStr, _rep: repStr };
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
          colors: plot ? colorMap[plot._g] : { bg: '#f1f5f9', hex: 'FFF1F5F9', text: '#000000', textHex: 'FF000000' }
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

  const handleExportExcel = async () => {
    if (!gridData || gridData.error) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Grid Map');

      // Create Header Row
      const headerRow = ['Trial', 'Rep', 'Row'];
      gridData.colHeaders.forEach(c => headerRow.push(`Col ${c}`));
      
      const excelHeader = sheet.addRow(headerRow);
      excelHeader.font = { bold: true };
      excelHeader.alignment = { horizontal: 'center' };
      
      // Add Grid Rows
      gridData.grid.forEach(rowObj => {
        // Find Trial and Rep from the first available plot in this row
        const firstPlotCell = rowObj.cols.find(c => c.plot);
        const trialVal = firstPlotCell ? firstPlotCell.plot._t : '-';
        const repVal = firstPlotCell ? firstPlotCell.plot._rep : '-';
        
        const rowData = [trialVal, repVal, `Row ${rowObj.rowIndex}`];
        
        rowObj.cols.forEach(cell => {
          if (cell.plot) {
            rowData.push(`P${cell.plot._p}\n${cell.plot._g}`);
          } else {
            rowData.push('');
          }
        });
        
        const excelRow = sheet.addRow(rowData);
        excelRow.height = 45; // Taller row to fit two lines of text
        
        // Style cells
        excelRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        excelRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        excelRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

        rowObj.cols.forEach((cell, cIdx) => {
          const colNum = 4 + cIdx;
          const excelCell = excelRow.getCell(colNum);
          excelCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          
          if (cell.plot) {
            excelCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: cell.colors.hex }
            };
            excelCell.font = {
              color: { argb: cell.colors.textHex },
              bold: true
            };
            
            // Add subtle border
            excelCell.border = {
              top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
          }
        });
      });

      // Adjust column widths
      sheet.columns.forEach((col, idx) => {
        if (idx === 0) col.width = 15; // Trial
        else if (idx === 1) col.width = 10; // Rep
        else if (idx === 2) col.width = 12; // Row
        else col.width = 15; // Plot columns
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Color_Grid_Map_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export Excel", err);
      alert("Failed to export Excel file.");
    }
  };

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
      
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        <button 
          onClick={handleExportExcel}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          <Download size={18} />
          Export to Excel
        </button>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '20px', display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 'min-content', border: '1.5px solid #000', width: 'max-content', background: '#fff' }}>
          
          {/* Visual Grid Header for Left Side Metadata */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderBottom: '2px solid #000' }}>
            <div style={{ width: '100px', padding: '8px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>Trial</div>
            <div style={{ width: '60px', padding: '8px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>Rep</div>
            <div style={{ width: '60px', padding: '8px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', borderRight: '2px solid #000' }}>Row</div>
            <div style={{ flex: 1 }}></div> {/* Empty space above columns */}
          </div>

          {gridData.grid.map((rowObj) => {
            const firstPlotCell = rowObj.cols.find(c => c.plot);
            const trialVal = firstPlotCell ? firstPlotCell.plot._t : '-';
            const repVal = firstPlotCell ? firstPlotCell.plot._rep : '-';

            return (
              <div key={`r-${rowObj.rowIndex}`} style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: '#f8fafc', color: '#334155', borderRight: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}>
                  {trialVal}
                </div>
                <div style={{ width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: '#f8fafc', color: '#334155', borderRight: '1px solid #cbd5e1', padding: '4px' }}>
                  {repVal}
                </div>
                <div style={{ width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', background: '#f8fafc', color: '#000', borderRight: '2px solid #000', fontWeight: 'bold' }}>
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
                      boxSizing: 'border-box',
                      borderRight: '1px solid #e2e8f0'
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
            );
          })}
          
          {/* Column footers */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderTop: '2px solid #000' }}>
             <div style={{ width: '100px', borderRight: '1px solid #cbd5e1' }}></div>
             <div style={{ width: '60px', borderRight: '1px solid #cbd5e1' }}></div>
             <div style={{ width: '60px', borderRight: '2px solid #000' }}></div>
             {gridData.colHeaders.map((c) => (
               <div key={`cf-${c}`} style={{ width: '100px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#000', fontWeight: 'bold', borderRight: '1px solid #e2e8f0' }}>
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
