import { useCallback, useRef, useState } from 'react';
import { synthesizeSpeech } from './ttsService';

/**
 * Hook que sintetiza y reproduce narración, exponiendo el visema activo en
 * cada instante para que Avatar.jsx anime el blendshape de boca correcto.
 */
export default function useTts() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentViseme, setCurrentViseme] = useState(null);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const visemesRef = useRef([]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setCurrentViseme(null);
  }, []);

  const speak = useCallback(async (text) => {
    stop();
    setError(null);
    try {
      const { audioUrl, visemes } = await synthesizeSpeech(text);
      visemesRef.current = visemes || [];

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        const t = audio.currentTime;
        const active = [...visemesRef.current].reverse().find((v) => v.time <= t);
        setCurrentViseme(active ? active.viseme : null);
      });
      audio.addEventListener('ended', () => {
        setIsSpeaking(false);
        setCurrentViseme(null);
      });

      setIsSpeaking(true);
      await audio.play();
    } catch (err) {
      setError(err);
      setIsSpeaking(false);
    }
  }, [stop]);

  return { speak, stop, isSpeaking, currentViseme, error };
}
