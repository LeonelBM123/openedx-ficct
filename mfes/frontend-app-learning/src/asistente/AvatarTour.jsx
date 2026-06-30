import React, {
  Suspense, useState, useRef, useEffect, useMemo, useCallback,
} from 'react';
import { Canvas } from '@react-three/fiber';
import Joyride from 'react-joyride';
import { getConfig } from '@edx/frontend-platform';

import Avatar from './Avatar';
import TourUI from './TourUI';
import { AVATAR_LIST } from './AvatarSwitcher';
import { portalTours } from './config/ToursConfig';
import { AzureSpeechService } from './config/azureSpeechService';

import './index.scss';

const InvisibleTooltip = () => <div style={{ display: 'none' }} />;

const AvatarTour = ({ tourName = 'learning' }) => {
  const steps = portalTours[tourName];

  const [isMinimized, setIsMinimized] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [lipSyncData, setLipSyncData] = useState(null);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [aiResponse, setAiResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiBubbleVisible, setAiBubbleVisible] = useState(false);
  const hideTimer = useRef(null);

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

  useEffect(() => {
    if (!steps) { return undefined; }
    const step = steps[currentStep];

    cleanupAudio();

    if (!isTourActive || !step?.useAzureTTS || !azureSpeech) { return undefined; }

    let cancelled = false;

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
        audioRef.current.onended = () => setIsSpeaking(false);
        setLipSyncData(ld);

        await audioRef.current.play();
        setIsSpeaking(true);
      } catch (err) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error('Error generando audio Azure:', err);
        }
      }
    };

    loadAudio();

    return () => {
      cancelled = true;
      cleanupAudio();
    };
  }, [currentStep, isTourActive, steps, azureSpeech, selectedAvatar.voice, cleanupAudio]);

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
      const contexto = steps?.[currentStep]?.text;
      let answer = '';

      if (openrouterKey) {
        const model = getConfig().OPENROUTER_MODEL || 'openai/gpt-4o-mini';
        const systemPrompt = 'Eres un asistente académico. Responde de forma clara y concisa en español, máximo 3 oraciones.';
        const userMsg = contexto ? `Contexto del curso: ${contexto}\n\nPregunta: ${q}` : q;
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
          body: JSON.stringify({ pregunta: q, contexto }),
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
  }, [steps, currentStep, azureSpeech, selectedAvatar.voice, cleanupAudio]);

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

  const handleStats = () => {
    // TODO: implementar panel de estadísticas
  };

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

  const joyrideSteps = steps.map((step) => ({
    target: step.targetDOMId ? `#${step.targetDOMId}` : 'body',
    disableBeacon: true,
    content: '',
  }));

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
        {/* Burbuja respuesta — ENCIMA del avatar */}
        {aiBubbleVisible && (
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
        />
      </div>
    </>
  );
};

export default AvatarTour;
