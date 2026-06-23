import React, { useState, useEffect } from 'react';
import { Mic, MicOff, AlertTriangle } from 'lucide-react';

export default function VoiceDictation({ onDictationResult }) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = 'en-US';

    recog.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recog.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onDictationResult(text);
      setIsListening(false);
    };

    recog.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'network') {
        setError("Offline Warning: Voice dictation requires an internet connection on this device unless local language models are installed. Please use manual typing.");
      } else if (event.error === 'not-allowed') {
        setError("Microphone access denied.");
      } else {
        setError(`Error: ${event.error}`);
      }
    };

    recog.onend = () => {
      setIsListening(false);
    };

    setRecognition(recog);
  }, [onDictationResult]);

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      recognition?.start();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
      <button 
        onClick={toggleListening}
        disabled={!recognition}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          border: 'none',
          background: isListening ? '#ef4444' : '#0ea5e9',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: isListening ? '0 0 15px rgba(239, 68, 68, 0.6)' : '0 4px 6px rgba(0,0,0,0.1)',
          transition: 'all 0.2s',
          opacity: !recognition ? 0.5 : 1
        }}
      >
        {isListening ? <MicOff size={32} /> : <Mic size={32} />}
      </button>
      
      {isListening && <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px', marginTop: '8px', animation: 'pulse 1.5s infinite' }}>Listening...</p>}
      
      {error && (
        <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px', maxWidth: '300px', textAlign: 'left' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
