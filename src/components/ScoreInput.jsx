import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Plus, X } from 'lucide-react';

export default function ScoreInput({ trait, value, onChange, onSave }) {
  const parseValue = (val) => {
    if (val === null || val === undefined || val === '') return [''];
    const strVal = String(val);
    if (strVal.includes(';')) {
      return strVal.split(';').map(s => s.trim());
    }
    return [strVal];
  };

  const [localValues, setLocalValues] = useState(parseValue(value));
  const [confirmStates, setConfirmStates] = useState({}); // index -> state

  // Update local values when external value prop changes (e.g., when switching plots)
  useEffect(() => {
    setLocalValues(parseValue(value));
    setConfirmStates({});
  }, [value]);

  const propagateChanges = (valuesArr) => {
    const cleanValues = valuesArr.filter(v => v !== '');
    if (cleanValues.length === 0) {
      onChange('');
    } else if (cleanValues.length === 1) {
      onChange(cleanValues[0]);
    } else {
      onChange(cleanValues.join(' ; '));
    }
  };

  const handleChange = (idx, e) => {
    let val = e.target.value;
    const newValues = [...localValues];
    newValues[idx] = val;
    setLocalValues(newValues);
    
    setConfirmStates(prev => ({ ...prev, [idx]: 'none' }));

    if (trait.type === 'text') {
      propagateChanges(newValues);
      return;
    }

    let numVal = Number(val);
    if (val === '' || isNaN(numVal)) {
      propagateChanges(newValues);
      return;
    }

    if ((trait.min !== null && numVal < trait.min) || (trait.max !== null && numVal > trait.max)) {
      setConfirmStates(prev => ({ ...prev, [idx]: 'hard_confirm' }));
      return;
    }

    if (trait.soft_max !== null && numVal > trait.soft_max) {
      setConfirmStates(prev => ({ ...prev, [idx]: 'soft_confirm' }));
      return;
    }

    propagateChanges(newValues);
  };

  const handleConfirm = (idx) => {
    setConfirmStates(prev => ({ ...prev, [idx]: 'none' }));
    propagateChanges(localValues);
    if (onSave) onSave();
  };

  const handleBlur = (idx) => {
    if (confirmStates[idx] !== 'soft_confirm' && confirmStates[idx] !== 'hard_confirm' && onSave) {
      onSave();
    }
  };

  const addSubSample = () => {
    setLocalValues([...localValues, '']);
  };

  const removeSubSample = (idx) => {
    const newValues = localValues.filter((_, i) => i !== idx);
    if (newValues.length === 0) newValues.push('');
    setLocalValues(newValues);
    propagateChanges(newValues);
    if (onSave) onSave();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Blur current to save it if it hasn't already (though handleChange saves automatically, blur triggers explicit save without warnings if safe)
      e.target.blur();
      
      // Find all score inputs on the page
      const inputs = Array.from(document.querySelectorAll('input.score-input-field'));
      const currentIndex = inputs.indexOf(e.target);
      
      if (currentIndex > -1 && currentIndex < inputs.length - 1) {
        const nextInput = inputs[currentIndex + 1];
        nextInput.focus();
        
        // Scroll down so the focused input is in the middle of the screen
        nextInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
          {trait.name}
        </label>
        <button 
          onClick={addSubSample}
          className="icon-btn" 
          style={{ width: '24px', height: '24px', background: '#f1f5f9', color: '#0ea5e9' }}
          title="Add Sub-sample"
        >
          <Plus size={14} />
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {localValues.map((localVal, idx) => {
          const cState = confirmStates[idx] || 'none';
          
          return (
            <div key={idx} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input 
                  type={trait.type === 'text' ? 'text' : 'number'}
                  inputMode={trait.type === 'decimal' ? 'decimal' : (trait.type === 'integer' ? 'numeric' : 'text')}
                  step={trait.type === 'decimal' ? 'any' : (trait.type === 'integer' ? '1' : undefined)}
                  className={`modern-input score-input-field ${cState !== 'none' ? 'warning-input' : ''}`}
                  style={{ 
                    flex: 1,
                    padding: '10px', 
                    borderRadius: '8px', 
                    border: `1px solid ${cState === 'none' ? '#cbd5e1' : '#eab308'}`,
                    background: cState === 'soft_confirm' ? '#fefce8' : cState === 'hard_confirm' ? '#fef2f2' : '#fff'
                  }}
                  value={localVal}
                  onChange={(e) => handleChange(idx, e)}
                  onBlur={() => handleBlur(idx)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Enter ${trait.name}...`}
                />
                
                {localValues.length > 1 && (
                  <button 
                    onClick={() => removeSubSample(idx)}
                    style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '0 10px', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              {/* Soft Limit Inline Confirmation */}
              {cState === 'soft_confirm' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', color: '#ca8a04', fontSize: '12px', fontWeight: 'bold' }}>
                  <AlertTriangle size={14} />
                  <span>Unusually high.</span>
                  <button onClick={() => handleConfirm(idx)} style={{ background: '#ca8a04', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Tap to confirm
                  </button>
                </div>
              )}

              {/* Hard Limit Explicit Override */}
              {cState === 'hard_confirm' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', color: '#dc2626', fontSize: '12px', fontWeight: 'bold' }}>
                  <AlertTriangle size={14} />
                  <span>Out of bounds.</span>
                  <button onClick={() => handleConfirm(idx)} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Keep Outlier
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
