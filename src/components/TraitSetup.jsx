import React, { useState } from 'react';
import { useStore } from '../store/store';
import { Plus, Trash2, Save } from 'lucide-react';

export default function TraitSetup() {
  const { traits, setTraits, addTrait } = useStore();
  const [newTrait, setNewTrait] = useState({
    name: '',
    type: 'decimal', // integer, decimal, categorical
    min: '',
    max: '',
    soft_max: ''
  });

  const handleAdd = () => {
    if (!newTrait.name) return alert("Trait name is required.");
    addTrait({
      ...newTrait,
      min: newTrait.min !== '' ? Number(newTrait.min) : null,
      max: newTrait.max !== '' ? Number(newTrait.max) : null,
      soft_max: newTrait.soft_max !== '' ? Number(newTrait.soft_max) : null
    });
    setNewTrait({ name: '', type: 'decimal', min: '', max: '', soft_max: '' });
  };

  const handleRemove = (index) => {
    const updated = traits.filter((_, i) => i !== index);
    setTraits(updated);
  };

  return (
    <div className="modern-card" style={{ marginTop: '20px' }}>
      <h3>⚙️ Trait Configuration</h3>
      <p className="text-muted" style={{ marginBottom: '16px' }}>Define the traits you want to score in this workspace and set biological limits to prevent typos.</p>
      
      {/* Existing Traits */}
      {traits.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {traits.map((t, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <strong>{t.name}</strong> <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>({t.type})</span>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                  Limits: {t.min ?? '-∞'} to {t.max ?? '∞'} {t.soft_max && ` | Warn > ${t.soft_max}`}
                </div>
              </div>
              <button onClick={() => handleRemove(idx)} className="icon-btn" style={{ color: '#ef4444' }}><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Trait Form */}
      <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#0369a1' }}>Add New Trait</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Name (e.g. Yield)</label>
            <input type="text" className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={newTrait.name} onChange={e => setNewTrait({...newTrait, name: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Type</label>
            <select className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={newTrait.type} onChange={e => setNewTrait({...newTrait, type: e.target.value})}>
              <option value="decimal">Decimal (e.g. 4.5)</option>
              <option value="integer">Integer (e.g. 5)</option>
              <option value="text">Text (e.g. Visual Remarks)</option>
            </select>
          </div>
        </div>

        {newTrait.type !== 'text' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hard Min</label>
              <input type="number" placeholder="e.g. 0" className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={newTrait.min} onChange={e => setNewTrait({...newTrait, min: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hard Max</label>
              <input type="number" placeholder="e.g. 100" className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={newTrait.max} onChange={e => setNewTrait({...newTrait, max: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Soft Max (Warn)</label>
              <input type="number" placeholder="e.g. 80" className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={newTrait.soft_max} onChange={e => setNewTrait({...newTrait, soft_max: e.target.value})} />
            </div>
          </div>
        )}

        <button 
          onClick={handleAdd}
          style={{ width: '100%', padding: '10px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <Plus size={18} /> Add Trait
        </button>
      </div>
    </div>
  );
}
