import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { db } from '../db/db';
import { Camera, Trash2, Image as ImageIcon } from 'lucide-react';

export default function PhotoCapture({ plotId }) {
  const { activeWorkspaceId } = useStore();
  const [photos, setPhotos] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Load photos from DB on mount and when plot changes
  useEffect(() => {
    if (!activeWorkspaceId || !plotId) return;
    
    const loadPhotos = async () => {
      try {
        const storedPhotos = await db.photos
          .where({ workspaceId: activeWorkspaceId, plotId: String(plotId) })
          .toArray();
        setPhotos(storedPhotos);
      } catch (err) {
        console.error("Failed to load photos", err);
      }
    };
    
    loadPhotos();
  }, [activeWorkspaceId, plotId]);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions
          const MAX_SIZE = 1024;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // 0.7 quality JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !activeWorkspaceId) return;

    setIsProcessing(true);
    
    try {
      const newPhotos = [];
      for (const file of files) {
        const compressedDataUrl = await compressImage(file);
        const photoRecord = {
          id: crypto.randomUUID(),
          workspaceId: activeWorkspaceId,
          plotId: String(plotId),
          dataUrl: compressedDataUrl,
          timestamp: Date.now()
        };
        await db.photos.add(photoRecord);
        newPhotos.push(photoRecord);
      }
      
      setPhotos(prev => [...prev, ...newPhotos]);
    } catch (err) {
      console.error("Error saving photos:", err);
      alert("Failed to process photos.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // reset
      }
    }
  };

  const deletePhoto = async (id) => {
    if (window.confirm("Delete this photo?")) {
      try {
        await db.photos.delete(id);
        setPhotos(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        console.error("Failed to delete photo", err);
      }
    }
  };

  return (
    <div className="modern-card" style={{ padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ImageIcon size={18} />
          Plot Photos ({photos.length})
        </h3>
        
        <div>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            multiple 
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            id={`camera-input-${plotId}`}
          />
          <label 
            htmlFor={`camera-input-${plotId}`}
            className="icon-btn"
            style={{ 
              background: '#0ea5e9', 
              color: 'white', 
              padding: '8px 12px', 
              borderRadius: '8px', 
              cursor: isProcessing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 'bold',
              fontSize: '14px',
              opacity: isProcessing ? 0.7 : 1
            }}
          >
            <Camera size={18} />
            {isProcessing ? 'Processing...' : 'Take Photo'}
          </label>
        </div>
      </div>

      {photos.length > 0 ? (
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
          {photos.map(p => (
            <div key={p.id} style={{ position: 'relative', flexShrink: 0, width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <img src={p.dataUrl} alt="Plot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button 
                onClick={() => deletePhoto(p.id)}
                style={{ 
                  position: 'absolute', 
                  top: '4px', 
                  right: '4px', 
                  background: 'rgba(239, 68, 68, 0.9)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '24px', 
                  height: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer' 
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '13px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          No photos for this plot yet.
        </div>
      )}
    </div>
  );
}
