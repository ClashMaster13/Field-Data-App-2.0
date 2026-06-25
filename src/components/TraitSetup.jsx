import React, { useState } from 'react';
import { useStore } from '../store/store';
import { Plus, Trash2, Save, Edit, AlertTriangle } from 'lucide-react';

export default function TraitSetup() {
  const { traits, setTraits, addTrait, updateTrait } = useStore();
  const [newTrait, setNewTrait] = useState({
    name: '',
    type: 'decimal', // integer, decimal, categorical
    min: '',
    max: '',
    soft_max: ''
  });
  const [editingTraitIdx, setEditingTraitIdx] = useState(null);
  const [editingTrait, setEditingTrait] = useState(null);

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

  const handleEditStart = (idx, trait) => {
    setEditingTraitIdx(idx);
    setEditingTrait({
      ...trait,
      min: trait.min ?? '',
      max: trait.max ?? '',
      soft_max: trait.soft_max ?? ''
    });
  };

  const handleEditSave = () => {
    if (!editingTrait.name) return alert("Trait name is required.");
    updateTrait(editingTraitIdx, {
      ...editingTrait,
      min: editingTrait.min !== '' ? Number(editingTrait.min) : null,
      max: editingTrait.max !== '' ? Number(editingTrait.max) : null,
      soft_max: editingTrait.soft_max !== '' ? Number(editingTrait.soft_max) : null,
      needsConfig: false
    });
    setEditingTraitIdx(null);
    setEditingTrait(null);
  };

  return (
    <div className="modern-card" style={{ marginTop: '20px' }}>
      <h3>⚙️ Trait Configuration</h3>
      <p className="text-muted" style={{ marginBottom: '16px' }}>Define the traits you want to score in this workspace and set biological limits to prevent typos.</p>
      
      {/* Existing Traits */}
      {traits.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {traits.map((t, idx) => {
            if (editingTraitIdx === idx) {
              return (
                <div key={idx} style={{ background: '#fef9c3', padding: '16px', borderRadius: '8px', border: '1px solid #fde047', marginBottom: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#a16207' }}>Edit Trait</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Name</label>
                      <input type="text" className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={editingTrait.name} onChange={e => setEditingTrait({...editingTrait, name: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Type</label>
                      <select className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={editingTrait.type} onChange={e => setEditingTrait({...editingTrait, type: e.target.value})}>
                        <option value="decimal">Decimal</option>
                        <option value="integer">Integer</option>
                        <option value="text">Text</option>
                      </select>
                    </div>
                  </div>
                  {editingTrait.type !== 'text' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ flex: '1 1 80px', minWidth: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hard Min</label>
                        <input type="number" className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={editingTrait.min} onChange={e => setEditingTrait({...editingTrait, min: e.target.value})} />
                      </div>
                      <div style={{ flex: '1 1 80px', minWidth: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hard Max</label>
                        <input type="number" className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={editingTrait.max} onChange={e => setEditingTrait({...editingTrait, max: e.target.value})} />
                      </div>
                      <div style={{ flex: '1 1 80px', minWidth: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Soft Max</label>
                        <input type="number" className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={editingTrait.soft_max} onChange={e => setEditingTrait({...editingTrait, soft_max: e.target.value})} />
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditingTraitIdx(null)} style={{ flex: 1, padding: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px' }}>Cancel</button>
                    <button onClick={handleEditSave} style={{ flex: 1, padding: '8px', background: '#eab308', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Save Changes</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.needsConfig ? '#fffbeb' : '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '8px', border: `1px solid ${t.needsConfig ? '#fde68a' : '#e2e8f0'}` }}>
                <div>
                  <strong>{t.name}</strong> <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>({t.type})</span>
                  {t.needsConfig && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>
                      <AlertTriangle size={14} /> Needs configuration
                    </div>
                  )}
                  {!t.needsConfig && (
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                      Limits: {t.min ?? '-∞'} to {t.max ?? '∞'} {t.soft_max && ` | Warn > ${t.soft_max}`}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEditStart(idx, t)} className="icon-btn" style={{ color: '#0ea5e9' }}><Edit size={18} /></button>
                  <button onClick={() => handleRemove(idx)} className="icon-btn" style={{ color: '#ef4444' }}><Trash2 size={18} /></button>
                </div>
              </div>
            );
          })}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: '1 1 80px', minWidth: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hard Min</label>
              <input type="number" placeholder="e.g. 0" className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={newTrait.min} onChange={e => setNewTrait({...newTrait, min: e.target.value})} />
            </div>
            <div style={{ flex: '1 1 80px', minWidth: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hard Max</label>
              <input type="number" placeholder="e.g. 100" className="workspace-selector modern-input" style={{ width: '100%', marginTop: '4px' }} value={newTrait.max} onChange={e => setNewTrait({...newTrait, max: e.target.value})} />
            </div>
            <div style={{ flex: '1 1 80px', minWidth: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Soft Max</label>
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
