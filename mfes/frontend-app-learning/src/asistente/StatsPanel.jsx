import React, { useState } from 'react';

const glass = {
  background: 'rgba(255,255,255,0.94)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  borderRadius: '14px',
};

const sectionTitle = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: '#888',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

const Bar = ({ percent, color = 'linear-gradient(90deg,#0056D2,#00A3E0)' }) => (
  <div style={{
    height: '5px', borderRadius: '3px',
    background: 'rgba(0,86,210,0.1)',
    overflow: 'hidden', margin: '3px 0',
  }}
  >
    <div style={{
      height: '100%',
      width: `${Math.min(100, Math.max(0, percent || 0))}%`,
      background: color,
      borderRadius: '3px',
      transition: 'width 0.4s ease',
    }}
    />
  </div>
);

const Divider = () => (
  <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', margin: '10px 0' }} />
);

const StatsPanel = ({ data, loading, onClose }) => {
  const [sectionsExpanded, setSectionsExpanded] = useState(false);

  const renderContent = () => {
    if (loading) {
      return <p style={{ color: '#999', fontSize: '12px', margin: '4px 0' }}>Cargando…</p>;
    }
    if (!data) {
      return <p style={{ color: '#c00', fontSize: '12px', margin: '4px 0' }}>No se pudo cargar el progreso.</p>;
    }

    const {
      completionSummary,
      courseGrade,
      sectionScores,
      assignmentTypeGradeSummary,
    } = data;

    // --- Completitud ---
    const done = completionSummary?.completeCount || 0;
    const pending = completionSummary?.incompleteCount || 0;
    const locked = completionSummary?.lockedCount || 0;
    const total = done + pending + locked;
    const completePct = total > 0 ? Math.round((done / total) * 100) : 0;

    // --- Calificación general ---
    const gradePct = courseGrade?.percent != null ? Math.round(courseGrade.percent * 100) : null;
    const isPassing = courseGrade?.isPassing;
    const letter = courseGrade?.letterGrade;

    // --- Tipos de actividad ---
    const assignments = (assignmentTypeGradeSummary || []).filter((a) => a.weight > 0);

    // --- Secciones ---
    const sections = sectionScores || [];
    const visibleSections = sectionsExpanded ? sections : sections.slice(0, 3);

    return (
      <>
        {/* ── Progreso de completitud ── */}
        <div style={sectionTitle}>Progreso del curso</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#0056D2', lineHeight: 1 }}>
            {completePct}%
          </span>
          <span style={{ fontSize: '10.5px', color: '#777' }}>
            {done}/{total} unidades
          </span>
        </div>
        <Bar percent={completePct} />
        {locked > 0 && (
          <span style={{ fontSize: '10px', color: '#aaa' }}>{locked} bloqueadas</span>
        )}

        <Divider />

        {/* ── Calificación general ── */}
        {gradePct !== null && (
          <>
            <div style={sectionTitle}>Calificación general</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', borderRadius: '10px',
              background: isPassing ? 'rgba(0,150,70,0.07)' : 'rgba(200,0,0,0.06)',
              marginBottom: '6px',
            }}
            >
              <span style={{
                fontSize: '28px', fontWeight: 800, lineHeight: 1,
                color: isPassing ? '#007a3d' : '#c00',
                minWidth: '36px', textAlign: 'center',
              }}
              >
                {letter || `${gradePct}%`}
              </span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#222' }}>
                  {gradePct}%
                </div>
                <div style={{
                  fontSize: '10.5px', fontWeight: 600,
                  color: isPassing ? '#007a3d' : '#c00',
                }}
                >
                  {isPassing ? '✓ Aprobado' : '✗ No aprobado'}
                </div>
              </div>
            </div>
            <Bar
              percent={gradePct}
              color={isPassing
                ? 'linear-gradient(90deg,#007a3d,#00c060)'
                : 'linear-gradient(90deg,#c00,#ff4444)'}
            />

            <Divider />
          </>
        )}

        {/* ── Calificaciones por tipo de actividad ── */}
        {assignments.length > 0 && (
          <>
            <div style={sectionTitle}>Por tipo de actividad</div>
            {assignments.map((a) => {
              const avg = Math.round((a.averageGrade || 0) * 100);
              const weight = Math.round((a.weight || 0) * 100);
              return (
                <div key={a.type} style={{ marginBottom: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#333', fontWeight: 500 }}>
                      {a.type}
                      <span style={{ color: '#aaa', fontWeight: 400 }}> · {weight}% del total</span>
                    </span>
                    <span style={{ fontWeight: 700, color: avg >= 60 ? '#007a3d' : '#c00' }}>
                      {avg}%
                    </span>
                  </div>
                  <Bar
                    percent={avg}
                    color={avg >= 60
                      ? 'linear-gradient(90deg,#007a3d,#00c060)'
                      : 'linear-gradient(90deg,#c00,#ff6666)'}
                  />
                </div>
              );
            })}
            <Divider />
          </>
        )}

        {/* ── Calificaciones por sección ── */}
        {sections.length > 0 && (
          <>
            <div style={sectionTitle}>Por sección</div>
            {visibleSections.map((sec) => {
              const earned = sec.subsections?.reduce((s, sub) => s + (sub.numPointsEarned || 0), 0) || 0;
              const possible = sec.subsections?.reduce((s, sub) => s + (sub.numPointsPossible || 0), 0) || 0;
              const pct = possible > 0 ? Math.round((earned / possible) * 100) : null;
              return (
                <div key={sec.displayName} style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{
                      color: '#333', overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', maxWidth: '175px',
                    }}
                    >
                      {sec.displayName}
                    </span>
                    <span style={{ flexShrink: 0, marginLeft: '6px', color: '#555', fontWeight: 600 }}>
                      {possible > 0 ? `${earned}/${possible} pts` : '—'}
                      {pct !== null && <span style={{ color: '#0056D2', marginLeft: '4px' }}>({pct}%)</span>}
                    </span>
                  </div>
                  {pct !== null && <Bar percent={pct} />}
                </div>
              );
            })}
            {sections.length > 3 && (
              <button
                type="button"
                onClick={() => setSectionsExpanded((e) => !e)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#0056D2', fontSize: '10.5px', padding: '2px 0', marginTop: '2px',
                }}
              >
                {sectionsExpanded ? '▲ Ver menos' : `▼ Ver ${sections.length - 3} más`}
              </button>
            )}
          </>
        )}
      </>
    );
  };

  return (
    <div style={{ ...glass, padding: '14px 16px', color: '#1a2a4a', position: 'relative' }}>
      <button
        type="button"
        onClick={onClose}
        title="Cerrar"
        style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '14px', color: '#aaa', lineHeight: 1, padding: '2px',
        }}
      >
        ✕
      </button>
      <div style={{ fontWeight: 800, fontSize: '13px', color: '#0056D2', marginBottom: '12px', paddingRight: '24px' }}>
        Mi progreso
      </div>
      {renderContent()}
    </div>
  );
};

export default StatsPanel;
