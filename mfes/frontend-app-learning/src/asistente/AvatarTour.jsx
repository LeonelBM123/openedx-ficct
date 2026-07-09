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
import { AzureSpeechService } from './config/azureSpeechService';
import { useContextId } from '../data/hooks';
import { getProgressTabData } from '../course-home/data/api';
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
  const tourIsFirstVisitRef = useRef(false);
  const suppressedNativeModalRef = useRef(false);

  const selectedAvatar = AVATAR_LIST[avatarIndex];

  const audioRef = useRef(null);
  const revokeAudioRef = useRef(null);

  const azureSpeech = useMemo(() => {
    const key = getConfig().AZURE_SPEECH_KEY;
    const region = getConfig().AZURE_SPEECH_REGION;
    return (key && region) ? new AzureSpeechService(key, region) : null;
  }, []);

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

    if (!isTourActive || !step?.useAzureTTS || !azureSpeech) { return undefined; }

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
        const { audioData, lipSyncData: ld } = await azureSpeech.textToSpeech(
          step.text,
          selectedAvatar.voice,
        );
        if (cancelled) { return; }

        const blob = new Blob([audioData], { type: 'audio/mpeg' });
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
  }, [currentStep, isTourActive, steps, azureSpeech, selectedAvatar.voice, cleanupAudio, endTour]);

  const buildLLMContext = useCallback(() => {
    const lines = [];
    if (course?.title) { lines.push(`Curso: ${course.title}`); }
    if (section?.title) { lines.push(`Sección: ${section.title}`); }
    if (sequence?.title) {
      lines.push(`Lección: ${sequence.title}${sequence.format ? ` (${sequence.format})` : ''}`);
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
    return lines.join('\n');
  }, [course, section, sequence, unit, statsData]);

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
        const systemPrompt = 'Eres un asistente académico de la plataforma. Recibes contexto del curso y progreso del estudiante. Responde preguntas sobre el curso de forma clara y concisa en español, máximo 3 oraciones. Si la pregunta es sobre el contenido específico de una lección que no puedes ver, indícalo.';
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

      if (answer && azureSpeech) {
        const { audioData, lipSyncData: ld } = await azureSpeech.textToSpeech(
          answer,
          selectedAvatar.voice,
        );
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        revokeAudioRef.current = () => URL.revokeObjectURL(audioUrl);
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsSpeaking(false);
        setLipSyncData(ld);
        await audioRef.current.play();
        setIsSpeaking(true);
      }
    } catch {
      setIsThinking(false);
      setAiResponse('❌ No pude responder esa pregunta en este momento.');
    }
  }, [buildLLMContext, azureSpeech, selectedAvatar.voice, cleanupAudio]);

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
            borderLeft: '3px solid #0056D2',
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
            borderLeft: '3px solid #0056D2',
          }}
          >
            <div>
              {steps[currentStep].text}
              {isSpeaking && (
                <span style={{ marginLeft: '6px', fontSize: '11px', color: '#0056D2' }}>🔊</span>
              )}
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
            borderLeft: '3px solid #0056D2',
          }}
          >
            {isThinking
              ? <span style={{ color: '#888' }}>Pensando…</span>
              : aiResponse}
            {isSpeaking && (
              <span style={{ marginLeft: '6px', fontSize: '11px', color: '#0056D2' }}>🔊</span>
            )}
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
