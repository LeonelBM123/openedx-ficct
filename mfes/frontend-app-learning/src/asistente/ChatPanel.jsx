import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const headerButton = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: '#0056D2',
  fontSize: '12px',
  padding: '4px 8px',
  borderRadius: '8px',
};

const bubbleBase = {
  maxWidth: '85%',
  padding: '7px 10px',
  borderRadius: '12px',
  fontSize: '12.5px',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

/**
 * Modo "chat" del asistente: la misma conversación que el avatar, pero como hilo de
 * mensajes con historial, sin el modelo 3D ni la voz. El historial vive en
 * AvatarTour (compartido entre ambos modos) y se manda al LLM en cada pregunta.
 */
const ChatPanel = ({
  messages,
  greeting,
  isThinking,
  question,
  setQuestion,
  onAsk,
  onSwitchMode,
  onMinimize,
  onClear,
}) => {
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) { el.scrollTop = el.scrollHeight; }
  }, [messages, isThinking]);

  const canSend = !!question.trim() && !isThinking;

  const handleSend = () => {
    if (canSend) { onAsk(question); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showGreeting = !!greeting && messages.length === 0;

  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        height: '420px',
        background: 'rgba(255,255,255,0.96)',
        borderRadius: '14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px 6px 12px',
        background: 'linear-gradient(135deg, #0056D2 0%, #00A3E0 100%)',
        color: '#fff',
      }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600 }}>Asistente</span>
        <span style={{ display: 'flex', gap: '2px' }}>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              title="Borrar conversación"
              style={{ ...headerButton, color: '#fff' }}
            >
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={onSwitchMode}
            title="Cambiar al modo avatar"
            style={{ ...headerButton, color: '#fff' }}
          >
            🧑 Avatar
          </button>
          <button
            type="button"
            onClick={onMinimize}
            title="Minimizar"
            style={{ ...headerButton, color: '#fff' }}
          >
            ✕
          </button>
        </span>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {showGreeting && (
          <div style={{ ...bubbleBase, alignSelf: 'flex-start', background: '#eef3fc', color: '#1a2a4a' }}>
            {greeting}
          </div>
        )}
        {messages.length === 0 && !showGreeting && (
          <div style={{ color: '#888', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
            Escribe una pregunta sobre el curso para empezar.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            // El historial solo se agrega al final, así que el índice es estable.
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            style={{
              ...bubbleBase,
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? '#0056D2' : '#eef3fc',
              color: m.role === 'user' ? '#fff' : '#1a2a4a',
            }}
          >
            {m.content}
          </div>
        ))}
        {isThinking && (
          <div style={{
            ...bubbleBase, alignSelf: 'flex-start', background: '#eef3fc', color: '#888',
          }}
          >
            Pensando…
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px',
        borderTop: '1px solid #e3e8f2',
      }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta…"
          disabled={isThinking}
          style={{
            flex: 1,
            border: '1px solid #d5dcea',
            borderRadius: '10px',
            outline: 'none',
            padding: '7px 10px',
            fontSize: '12.5px',
            color: '#222',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          title="Enviar"
          style={{
            border: 'none',
            borderRadius: '9px',
            background: canSend ? '#0056D2' : '#c8d6f0',
            color: '#fff',
            padding: '7px 12px',
            fontSize: '14px',
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

ChatPanel.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.shape({
    role: PropTypes.oneOf(['user', 'assistant']).isRequired,
    content: PropTypes.string.isRequired,
  })).isRequired,
  greeting: PropTypes.string,
  isThinking: PropTypes.bool.isRequired,
  question: PropTypes.string.isRequired,
  setQuestion: PropTypes.func.isRequired,
  onAsk: PropTypes.func.isRequired,
  onSwitchMode: PropTypes.func.isRequired,
  onMinimize: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

ChatPanel.defaultProps = {
  greeting: '',
};

export default ChatPanel;
