import React, {
  Suspense, useState, useRef, useEffect, useMemo, useCallback,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMatch } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import Joyride from 'react-joyride';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import Avatar from './Avatar';
import TourUI from './TourUI';
import StatsPanel from './StatsPanel';
import { AVATAR_LIST } from './AvatarSwitcher';
import { portalTours } from './config/ToursConfig';
import { textToSpeech } from './config/ttsService';
import { useContextId } from '../data/hooks';
import { getProgressTabData, getDatesTabData } from '../course-home/data/api';
import { useModel } from '../generic/model-store';
import { closeNewUserCourseHomeModal, endCourseHomeTour } from '../product-tours/data';
import { DECODE_ROUTES } from '../constants';

import './index.scss';

const InvisibleTooltip = () => <div style={{ display: 'none' }} />;

const AvatarTour = ({ tourName = 'learning' }) => {
  const steps = portalTours[tourName];
  const courseId = useContextId();
  const dispatch = useDispatch();

  const sequenceId = useSelector((state) => state.courseware?.sequenceId);
  const unitId = useSelector((state) => state.courseware?.unitId);
  const course = useModel('coursewareMeta', courseId);
  const sequence = useModel('sequences', sequenceId);
  const section = useModel('sections', sequence?.sectionId);
  const unit = useModel('units', unitId);

  const { toursEnabled, showNewUserCourseHomeModal } = useSelector((state) => state.tours);
  const isOnCourseHome = !!useMatch(DECODE_ROUTES.HOME);
  const { username } = getAuthenticatedUser() || {};

  const [isMinimized, setIsMinimized] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [lipSyncData, setLipSyncData] = useState(null);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [aiResponse, setAiResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiBubbleVisible, setAiBubbleVisible] = useState(false);
  const hideTimer = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [datesData, setDatesData] = useState(null);
  const tourIsFirstVisitRef = useRef(false);
  const suppressedNativeModalRef = useRef(false);
  const greetedRef = useRef(false);

  const selectedAvatar = AVATAR_LIST[avatarIndex];

  const audioRef = useRef(null);
  const revokeAudioRef = useRef(null);

  const ttsEnabled = useMemo(() => !!getConfig().AVATAR_TTS_API_URL, []);

  // Carga eager (al abrir el curso) del progreso y las fechas para que el
  // avatar tenga todo el contexto listo sin depender de que el estudiante
  // abra el panel de estadísticas. Fallos silenciosos: si algo no carga,
  // simplemente no se incluye esa parte del contexto.
  useEffect(() => {
    if (!courseId) { return undefined; }
    let cancelled = false;
    getProgressTabData(courseId)
      .then((d) => { if (!cancelled) { setStatsData(d); } })
      .catch(() => {});
    getDatesTabData(courseId)
      .then((d) => { if (!cancelled) { setDatesData(d); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [courseId]);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
    }
    if (revokeAudioRef.current) {
      revokeAudioRef.current();
      revokeAudioRef.current = null;
    }
  }, []);

  const endTour = useCallback(() => {
    setIsTourActive(false);
    setCurrentStep(0);
    setIsSpeaking(false);
    cleanupAudio();
    if (tourIsFirstVisitRef.current && username) {
      dispatch(endCourseHomeTour(username));
    }
    tourIsFirstVisitRef.current = false;
  }, [cleanupAudio, dispatch, username]);

  const startTour = useCallback((isFirstVisit) => {
    tourIsFirstVisitRef.current = isFirstVisit;
    setShowWelcome(false);
    setIsMinimized(false);
    setCurrentStep(0);
    setIsTourActive(true);
  }, []);

  const handleDismissWelcome = useCallback(() => {
    setShowWelcome(false);
    if (username) {
      dispatch(endCourseHomeTour(username));
    }
  }, [dispatch, username]);

  // Detecta si el usuario entra por primera vez al tab de inicio del curso
  // (vía el estado nativo de product-tours) y ofrece el recorrido del avatar
  // en lugar del modal nativo.
  useEffect(() => {
    if (
      isOnCourseHome
      && toursEnabled
      && showNewUserCourseHomeModal
      && !suppressedNativeModalRef.current
    ) {
      suppressedNativeModalRef.current = true;
      dispatch(closeNewUserCourseHomeModal());
      setShowWelcome(true);
    }
  }, [isOnCourseHome, toursEnabled, showNewUserCourseHomeModal, dispatch]);

  useEffect(() => {
    if (!steps) { return undefined; }
    const step = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;

    cleanupAudio();

    if (!isTourActive || !step?.useTTS || !ttsEnabled) { return undefined; }

    let cancelled = false;

    const advanceTour = () => {
      if (isLastStep) {
        endTour();
      } else {
        setCurrentStep((s) => s + 1);
      }
    };

    const loadAudio = async () => {
      try {
        const { audioData, lipSyncData: ld } = await textToSpeech(
          step.text,
          selectedAvatar.voice,
        );
        if (cancelled) { return; }

        const blob = new Blob([audioData], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        revokeAudioRef.current = () => URL.revokeObjectURL(audioUrl);

        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          advanceTour();
        };
        setLipSyncData(ld);

        await audioRef.current.play();
        setIsSpeaking(true);
      } catch (err) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error('Error generando audio Azure:', err);
          advanceTour();
        }
      }
    };

    loadAudio();

    return () => {
      cancelled = true;
      cleanupAudio();
    };
  }, [currentStep, isTourActive, steps, ttsEnabled, selectedAvatar.voice, cleanupAudio, endTour]);

  // Reproduce texto con voz + lip-sync (síntesis en el servicio Modal).
  // Lanza si el navegador bloquea el autoplay (audio.play() sin gesto previo).
  const speakText = useCallback(async (text) => {
    if (!text || !ttsEnabled) { return; }
    const { audioData, lipSyncData: ld } = await textToSpeech(text, selectedAvatar.voice);
    cleanupAudio();
    const blob = new Blob([audioData], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(blob);
    revokeAudioRef.current = () => URL.revokeObjectURL(audioUrl);
    audioRef.current = new Audio(audioUrl);
    audioRef.current.onended = () => setIsSpeaking(false);
    setLipSyncData(ld);
    await audioRef.current.play();
    setIsSpeaking(true);
  }, [ttsEnabled, selectedAvatar.voice, cleanupAudio]);

  // Formatea la fecha de una entrega en español legible (ej. "18 de julio").
  const formatDueDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long' });
    } catch {
      return '';
    }
  };

  // Próximas entregas y entregas vencidas a partir de los date blocks del curso.
  const getDeadlines = useCallback(() => {
    const blocks = datesData?.courseDateBlocks || [];
    const now = new Date();
    const assignments = blocks.filter(
      (b) => b.dateType === 'assignment-due-date' && !b.complete && b.learnerHasAccess,
    );
    const upcoming = assignments
      .filter((b) => new Date(b.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const overdue = assignments
      .filter((b) => new Date(b.date) < now)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return { upcoming, overdue };
  }, [datesData]);

  // Áreas a reforzar: tipos de actividad y secciones por debajo del 60%.
  const getWeakAreas = useCallback(() => {
    const weak = [];
    (statsData?.assignmentTypeGradeSummary || [])
      .filter((a) => a.weight > 0 && a.averageGrade < 0.6)
      .forEach((a) => weak.push(`${a.type} (${Math.round((a.averageGrade || 0) * 100)}%)`));
    (statsData?.sectionScores || [])
      .map((sec) => {
        const earned = sec.subsections?.reduce((s, sub) => s + (sub.numPointsEarned || 0), 0) || 0;
        const possible = sec.subsections?.reduce((s, sub) => s + (sub.numPointsPossible || 0), 0) || 0;
        return { name: sec.displayName, pct: possible > 0 ? earned / possible : null };
      })
      .filter((s) => s.pct !== null && s.pct < 0.6)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3)
      .forEach((s) => weak.push(`${s.name} (${Math.round(s.pct * 100)}%)`));
    return weak;
  }, [statsData]);

  const buildLLMContext = useCallback(() => {
    const lines = [];
    if (course?.title) { lines.push(`Curso: ${course.title}`); }
    if (section?.title) { lines.push(`Sección actual: ${section.title}`); }
    if (sequence?.title) {
      lines.push(`Lección actual: ${sequence.title}${sequence.format ? ` (${sequence.format})` : ''}`);
    }
    if (unit?.title) { lines.push(`Unidad actual: ${unit.title}`); }
    if (statsData?.completionSummary) {
      const { completeCount, incompleteCount, lockedCount } = statsData.completionSummary;
      const total = completeCount + incompleteCount + lockedCount;
      if (total > 0) {
        lines.push(`Progreso: ${completeCount}/${total} unidades completadas (${Math.round((completeCount / total) * 100)}%)`);
      }
    }
    if (statsData?.courseGrade?.percent != null) {
      const g = statsData.courseGrade;
      lines.push(`Nota: ${Math.round(g.percent * 100)}%${g.letterGrade ? ` (${g.letterGrade})` : ''}${g.isPassing ? ' · Aprobado' : ' · No aprobado'}`);
    }
    if (statsData?.sectionScores && section?.title) {
      const sec = statsData.sectionScores.find((s) => s.displayName === section.title);
      if (sec) {
        const earned = sec.subsections.reduce((s, sub) => s + (sub.numPointsEarned || 0), 0);
        const possible = sec.subsections.reduce((s, sub) => s + (sub.numPointsPossible || 0), 0);
        if (possible > 0) {
          lines.push(`Puntos en sección actual: ${earned}/${possible} (${Math.round((earned / possible) * 100)}%)`);
        }
      }
    }
    const { upcoming, overdue } = getDeadlines();
    if (upcoming.length) {
      lines.push(`Próximas entregas: ${upcoming.slice(0, 3).map((b) => `${b.assignmentType ? `${b.assignmentType}: ` : ''}${b.title} — ${formatDueDate(b.date)}`).join('; ')}`);
    }
    if (overdue.length) {
      lines.push(`Entregas vencidas sin completar: ${overdue.slice(0, 3).map((b) => `${b.title} (venció el ${formatDueDate(b.date)})`).join('; ')}`);
    }
    const weak = getWeakAreas();
    if (weak.length) {
      lines.push(`Áreas a reforzar (bajo 60%): ${weak.join('; ')}`);
    }
    return lines.join('\n');
  }, [course, section, sequence, unit, statsData, getDeadlines, getWeakAreas]);

  // Resumen corto y natural para el saludo proactivo hablado.
  const buildGreeting = useCallback(() => {
    const parts = [];
    let progressPct = null;
    if (statsData?.completionSummary) {
      const { completeCount, incompleteCount, lockedCount } = statsData.completionSummary;
      const total = completeCount + incompleteCount + lockedCount;
      if (total > 0) { progressPct = Math.round((completeCount / total) * 100); }
    }
    if (progressPct !== null) {
      parts.push(`Llevas ${progressPct}% del curso completado.`);
    }
    const { upcoming, overdue } = getDeadlines();
    if (overdue.length) {
      parts.push(`Tienes ${overdue.length} entrega${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}, revisémoslas.`);
    } else if (upcoming.length) {
      const next = upcoming[0];
      parts.push(`Tu próxima entrega es "${next.title}" el ${formatDueDate(next.date)}.`);
    }
    const weak = getWeakAreas();
    if (weak.length) {
      parts.push(`Te recomiendo reforzar ${weak[0].replace(/\s*\(\d+%\)$/, '')}.`);
    }
    if (!parts.length) { return ''; }
    return `¡Hola! ${parts.join(' ')} Pregúntame lo que necesites.`;
  }, [statsData, getDeadlines, getWeakAreas]);

  const handleAskQuestion = useCallback(async (q) => {
    const openrouterKey = getConfig().OPENROUTER_API_KEY;
    const qaApiUrl = getConfig().AVATAR_QA_API_URL;

    if (!openrouterKey && !qaApiUrl) {
      setAiResponse('⚠️ El módulo de preguntas no está disponible por el momento.');
      return;
    }

    setIsThinking(true);
    setAiResponse('');
    cleanupAudio();
    setIsSpeaking(false);

    try {
      const contexto = buildLLMContext();
      let answer = '';

      if (openrouterKey) {
        const model = getConfig().OPENROUTER_MODEL || 'openai/gpt-4o-mini';
        const systemPrompt = 'Eres el asistente académico virtual del estudiante en esta plataforma. En el contexto recibes su ubicación actual en el curso (curso, sección, lección y unidad), su progreso de completitud, su calificación, sus próximas entregas y entregas vencidas, y las áreas que debe reforzar (temas o tipos de actividad por debajo del 60%). Usa esos datos concretos para responder preguntas como en qué va, qué le falta, cuándo entrega algo o qué debe repasar. Responde en español, claro, conciso y con tono alentador, máximo 3 oraciones. Si te preguntan por el contenido específico de una lección que no aparece en el contexto, indícalo con honestidad.';
        const userMsg = contexto ? `${contexto}\n\nPregunta del estudiante: ${q}` : q;
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMsg },
            ],
            max_tokens: 300,
          }),
        });
        const data = await res.json();
        answer = data.choices?.[0]?.message?.content || '';
      } else {
        const res = await fetch(qaApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pregunta: q, contexto: contexto || undefined }),
        });
        const data = await res.json();
        answer = data.respuesta || data.response || '';
      }

      setAiResponse(answer);
      setIsThinking(false);
      setQuestion('');

      if (answer && ttsEnabled) {
        await speakText(answer);
      }
    } catch {
      setIsThinking(false);
      setAiResponse('❌ No pude responder esa pregunta en este momento.');
    }
  }, [buildLLMContext, ttsEnabled, speakText]);

  const handlePrevAvatar = () => {
    cleanupAudio();
    setIsSpeaking(false);
    setLipSyncData(null);
    setAvatarIndex((i) => (i - 1 + AVATAR_LIST.length) % AVATAR_LIST.length);
  };

  const handleNextAvatar = () => {
    cleanupAudio();
    setIsSpeaking(false);
    setLipSyncData(null);
    setAvatarIndex((i) => (i + 1) % AVATAR_LIST.length);
  };

  const handleStats = useCallback(async () => {
    setStatsVisible((v) => {
      if (v) { return false; }
      if (!statsData && courseId) {
        setStatsLoading(true);
        getProgressTabData(courseId)
          .then((d) => { setStatsData(d); })
          .catch(() => { setStatsData(null); })
          .finally(() => { setStatsLoading(false); });
      }
      return true;
    });
  }, [courseId, statsData]);

  useEffect(() => {
    if (aiResponse || isThinking) {
      setAiBubbleVisible(true);
      clearTimeout(hideTimer.current);
    }
    if (aiResponse && !isSpeaking) {
      hideTimer.current = setTimeout(() => setAiBubbleVisible(false), 6000);
    }
    return () => clearTimeout(hideTimer.current);
  }, [aiResponse, isThinking, isSpeaking]);

  // Saludo proactivo hablado, una sola vez por carga, cuando ya hay datos y
  // no hay tour/bienvenida activos. El texto se muestra de inmediato; el audio
  // se intenta reproducir y, si el navegador bloquea el autoplay (sin gesto
  // previo), se reproduce en el primer clic del usuario en la página.
  useEffect(() => {
    if (greetedRef.current) { return undefined; }
    if (!statsData && !datesData) { return undefined; }
    if (isTourActive || showWelcome || isMinimized) { return undefined; }
    const text = buildGreeting();
    if (!text) { return undefined; }
    greetedRef.current = true;

    setAiResponse(text);
    setAiBubbleVisible(true);

    let gestureHandler = null;
    const cleanupGesture = () => {
      if (gestureHandler) {
        document.removeEventListener('pointerdown', gestureHandler);
        gestureHandler = null;
      }
    };
    speakText(text).catch(() => {
      gestureHandler = () => {
        cleanupGesture();
        speakText(text).catch(() => {});
      };
      document.addEventListener('pointerdown', gestureHandler);
    });

    return cleanupGesture;
  }, [statsData, datesData, isTourActive, showWelcome, isMinimized, buildGreeting, speakText]);

  if (!steps || getConfig().AVATAR_ENABLED?.toLowerCase() !== 'true') { return null; }

  // FAB cuando está minimizado
  if (isMinimized) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          title="Abrir asistente"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0056D2 0%, #00A3E0 100%)',
            border: 'none',
            boxShadow: '0 4px 16px rgba(0,86,210,0.4)',
            cursor: 'pointer',
            fontSize: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease',
          }}
        >
          {/* Ícono persona SVG */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </div>
    );
  }

  const joyrideSteps = steps.map((step) => {
    const targetExists = step.targetDOMId
      && typeof document !== 'undefined'
      && document.getElementById(step.targetDOMId);
    return {
      target: targetExists ? `#${step.targetDOMId}` : 'body',
      disableBeacon: true,
      content: '',
    };
  });

  const glassStyle = {
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 2px 14px rgba(0,0,0,0.13)',
    borderRadius: '12px',
  };

  return (
    <>
      <Joyride
        steps={joyrideSteps}
        stepIndex={currentStep}
        run={isTourActive}
        continuous
        tooltipComponent={InvisibleTooltip}
        disableOverlayClose
        disableScrolling={false}
        styles={{
          options: { zIndex: 9998 },
          overlay: { backgroundColor: 'rgba(0,0,0,0.55)' },
        }}
      />

      {/* Panel de estadísticas — a la IZQUIERDA del avatar */}
      {statsVisible && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '332px',
          width: '270px',
          zIndex: 9999,
          pointerEvents: 'auto',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxHeight: '480px',
          overflowY: 'auto',
        }}
        >
          <StatsPanel
            data={statsData}
            loading={statsLoading}
            onClose={() => setStatsVisible(false)}
          />
        </div>
      )}

      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '300px',
        zIndex: 9999,
        pointerEvents: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      >
        {/* Prompt de bienvenida — usuario nuevo en el curso */}
        {showWelcome && (
          <div style={{
            ...glassStyle,
            pointerEvents: 'auto',
            padding: '10px 12px',
            marginBottom: '6px',
            fontSize: '12.5px',
            color: '#1a2a4a',
            lineHeight: 1.5,
          }}
          >
            <div style={{ marginBottom: '8px' }}>
              👋 ¡Bienvenido! ¿Quieres un recorrido guiado por el curso?
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleDismissWelcome}
                style={{
                  border: 'none', background: 'transparent', color: '#666',
                  fontSize: '12px', cursor: 'pointer', padding: '4px 8px',
                }}
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={() => startTour(true)}
                style={{
                  border: 'none', borderRadius: '8px', background: '#0056D2',
                  color: '#fff', fontSize: '12px', cursor: 'pointer', padding: '4px 10px',
                }}
              >
                Comenzar
              </button>
            </div>
          </div>
        )}

        {/* Burbuja del recorrido — narración del paso actual */}
        {!showWelcome && isTourActive && steps[currentStep] && (
          <div style={{
            ...glassStyle,
            pointerEvents: 'auto',
            padding: '9px 12px',
            marginBottom: '6px',
            fontSize: '12.5px',
            color: '#1a2a4a',
            lineHeight: 1.55,
          }}
          >
            <div>
              {steps[currentStep].text}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px',
            }}
            >
              <span style={{ fontSize: '10px', color: '#999' }}>
                Paso {currentStep + 1}/{steps.length}
              </span>
              <button
                type="button"
                onClick={endTour}
                style={{
                  border: 'none', background: 'transparent', color: '#0056D2',
                  fontSize: '11px', cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Saltar recorrido
              </button>
            </div>
          </div>
        )}

        {/* Burbuja respuesta — ENCIMA del avatar */}
        {!showWelcome && !isTourActive && aiBubbleVisible && (
          <div style={{
            ...glassStyle,
            pointerEvents: 'auto',
            padding: '9px 12px',
            marginBottom: '6px',
            fontSize: '12.5px',
            color: '#1a2a4a',
            lineHeight: 1.55,
          }}
          >
            {isThinking
              ? <span style={{ color: '#888' }}>Pensando…</span>
              : aiResponse}
          </div>
        )}

        {/* Canvas 3D — fondo transparente, controles superpuestos */}
        <div style={{ position: 'relative', height: '280px' }}>
          {/* Botón ✕ — esquina superior derecha */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimizar"
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 10,
              pointerEvents: 'auto',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(6px)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          >
            ✕
          </button>

          {/* Selector de avatar — centrado en la parte inferior del canvas */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: '4px 10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
          }}
          >
            <button
              type="button"
              onClick={handlePrevAvatar}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '11px', color: '#555', padding: '2px 4px',
              }}
              title="Avatar anterior"
            >
              ◀
            </button>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{selectedAvatar?.emoji}</span>
            <span style={{ fontSize: '10px', color: '#888' }}>{avatarIndex + 1}/{AVATAR_LIST.length}</span>
            <button
              type="button"
              onClick={handleNextAvatar}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '11px', color: '#555', padding: '2px 4px',
              }}
              title="Siguiente avatar"
            >
              ▶
            </button>
          </div>

          <Canvas
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true }}
            camera={{ position: [0, 0.3, 1.8], fov: 35 }}
            onCreated={({ camera }) => camera.lookAt(0, 0.2, 0)}
          >
            <ambientLight intensity={1.2} />
            <directionalLight position={[2, 2, 5]} intensity={1.5} />
            <directionalLight position={[-2, 0, 2]} intensity={0.5} />
            <Suspense fallback={null}>
              <Avatar
                key={selectedAvatar.id}
                position={[-0.6, -2.4, -0.5]}
                scale={1.45}
                currentAnimation="Idle"
                audioRef={audioRef}
                lipSyncData={lipSyncData}
                avatarPath={selectedAvatar.path}
              />
            </Suspense>
          </Canvas>
        </div>

        {/* Input + estadísticas */}
        <TourUI
          onAskQuestion={handleAskQuestion}
          isThinking={isThinking}
          question={question}
          setQuestion={setQuestion}
          onStats={handleStats}
          onStartTour={() => startTour(false)}
          isTourActive={isTourActive}
        />
      </div>
    </>
  );
};

export default AvatarTour;
