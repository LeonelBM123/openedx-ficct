import React, { useRef } from 'react';

const StatsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor" aria-hidden="true">
    <rect x="0" y="9" width="3" height="6" rx="1" />
    <rect x="6" y="5" width="3" height="10" rx="1" />
    <rect x="12" y="1" width="3" height="14" rx="1" />
  </svg>
);

const glassBar = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 2px 14px rgba(0,0,0,0.13)',
  borderRadius: '12px',
};

const TourUI = ({
  onAskQuestion,
  isThinking,
  question,
  setQuestion,
  onStats,
}) => {
  const inputRef = useRef(null);

  const handleSend = () => {
    if (question.trim() && !isThinking) {
      onAskQuestion(question);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      pointerEvents: 'auto',
      padding: '0 4px 4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}
    >
      {/* Estadísticas — izquierda del input */}
      <button
        type="button"
        onClick={onStats}
        title="Estadísticas"
        style={{
          ...glassBar,
          border: 'none',
          cursor: 'pointer',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0056D2',
          flexShrink: 0,
        }}
      >
        <StatsIcon />
      </button>

      {/* Input + enviar */}
      <div style={{
        ...glassBar,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        padding: '4px 4px 4px 12px',
      }}
      >
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta…"
          disabled={isThinking}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '12.5px',
            color: '#222',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!question.trim() || isThinking}
          title="Enviar"
          style={{
            border: 'none',
            borderRadius: '9px',
            background: (question.trim() && !isThinking) ? '#0056D2' : '#c8d6f0',
            color: '#fff',
            padding: '6px 11px',
            fontSize: '14px',
            cursor: (question.trim() && !isThinking) ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default TourUI;
