import React, { useState } from 'react';

const glass = {
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 2px 14px rgba(0,0,0,0.13)',
  borderRadius: '12px',
};

const ProgressBar = ({ percent }) => (
  <div style={{
    height: '6px', borderRadius: '3px',
    background: 'rgba(0,86,210,0.12)',
    margin: '4px 0 8px',
    overflow: 'hidden',
  }}
  >
    <div style={{
      height: '100%',
      width: `${Math.min(100, Math.max(0, percent))}%`,
      background: 'linear-gradient(90deg, #0056D2, #00A3E0)',
      borderRadius: '3px',
      transition: 'width 0.4s ease',
    }}
    />
  </div>
);

const StatsPanel = ({ data, loading, onClose }) => {
  const [expanded, setExpanded] = useState(false);

  const renderContent = () => {
    if (loading) {
      return (
        <p style={{ color: '#888', margin: '8px 0', fontSize: '11.5px' }}>
          Cargando progreso…
        </p>
      );
    }

    if (!data) {
      return (
        <p style={{ color: '#c00', margin: '8px 0', fontSize: '11.5px' }}>
          No se pudo cargar el progreso.
        </p>
      );
    }

    const { completionSummary, courseGrade, sectionScores } = data;
    const total = (completionSummary?.completeCount || 0)
      + (completionSummary?.incompleteCount || 0)
      + (completionSummary?.lockedCount || 0);
    const done = completionSummary?.completeCount || 0;
    const completePct = total > 0 ? Math.round((done / total) * 100) : 0;
    const gradePct = courseGrade?.percent != null
      ? Math.round(courseGrade.percent * 100) : null;
    const isPassing = courseGrade?.isPassing;
    const letter = courseGrade?.letterGrade;

    const sections = sectionScores || [];
    const visible = expanded ? sections : sections.slice(0, 3);

    return (
      <>
        {/* Progreso de completitud */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 600, fontSize: '11px', color: '#555' }}>PROGRESO</span>
            <span style={{ fontWeight: 700, color: '#0056D2', fontSize: '13px' }}>{completePct}%</span>
          </div>
          <ProgressBar percent={completePct} />
          <span style={{ fontSize: '10.5px', color: '#777' }}>
            {done} de {total} unidades completadas
            {completionSummary?.lockedCount > 0 && ` · ${completionSummary.lockedCount} bloqueadas`}
          </span>
        </div>

        {/* Calificación */}
        {gradePct !== null && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 8px',
            background: isPassing ? 'rgba(0,160,80,0.08)' : 'rgba(200,0,0,0.06)',
            borderRadius: '8px',
            marginBottom: '8px',
          }}
          >
            <span style={{ fontSize: '18px', fontWeight: 700, color: isPassing ? '#007a3d' : '#c00' }}>
              {letter || `${gradePct}%`}
            </span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#333' }}>
                Nota actual: {gradePct}%
              </div>
              <div style={{ fontSize: '10px', color: isPassing ? '#007a3d' : '#c00' }}>
                {isPassing ? '✓ Aprobado' : '✗ No aprobado'}
              </div>
            </div>
          </div>
        )}

        {/* Secciones */}
        {sections.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
              SECCIONES
            </div>
            {visible.map((sec) => {
              const earned = sec.subsections?.reduce((s, sub) => s + (sub.numPointsEarned || 0), 0) || 0;
              const possible = sec.subsections?.reduce((s, sub) => s + (sub.numPointsPossible || 0), 0) || 0;
              const pct = possible > 0 ? Math.round((earned / possible) * 100) : null;
              return (
                <div key={sec.displayName} style={{ marginBottom: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                    <span style={{
                      color: '#333', overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', maxWidth: '180px',
                    }}
                    >
                      {sec.displayName}
                    </span>
                    {pct !== null && (
                      <span style={{ color: '#0056D2', fontWeight: 600, flexShrink: 0, marginLeft: '4px' }}>
                        {pct}%
                      </span>
                    )}
                  </div>
                  {pct !== null && <ProgressBar percent={pct} />}
                </div>
              );
            })}
            {sections.length > 3 && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#0056D2', fontSize: '10.5px', padding: '2px 0',
                }}
              >
                {expanded ? '▲ Ver menos' : `▼ Ver ${sections.length - 3} más`}
              </button>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div style={{
      ...glass,
      pointerEvents: 'auto',
      padding: '12px 14px',
      marginBottom: '6px',
      fontSize: '12px',
      color: '#1a2a4a',
      position: 'relative',
    }}
    >
      <button
        type="button"
        onClick={onClose}
        title="Cerrar"
        style={{
          position: 'absolute', top: '8px', right: '8px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '13px', color: '#888', lineHeight: 1, padding: '2px',
        }}
      >
        ✕
      </button>
      <div style={{ fontWeight: 700, fontSize: '12px', color: '#0056D2', marginBottom: '8px', paddingRight: '20px' }}>
        Mi progreso
      </div>
      {renderContent()}
    </div>
  );
};

export default StatsPanel;
