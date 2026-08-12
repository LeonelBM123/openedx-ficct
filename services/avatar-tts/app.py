"""
Servicio de voz del avatar (TTS + visemas para lip sync).

Es el mismo servicio que corre hoy en Modal (`modal/modal_api_v3.py`), sin los
decoradores de Modal, para poder correrlo como contenedor propio dentro del stack de
Tutor. Toda la logica -- VOICE_MAP, PHONEME_TO_VISEME, get_word_phonemes,
build_visemes, align_visemes -- es identica: si cambia una, hay que cambiar la otra.

Diferencia de fondo: en Modal corre sobre una GPU T4 y escala a cero a los 5 minutos
(scaledown_window=300), o sea que muchas peticiones pagan un cold start. Aca corre en
CPU pero el contenedor esta siempre caliente. Cual conviene depende del hardware y del
patron de uso; se mide con el README.

Contrato (el que consume mfes/frontend-app-learning/src/asistente/config/ttsService.js):
    POST /synthesize  {text, voice}  ->  {audio_base64 (WAV), visemes[{viseme,start,duration}]}
"""
import base64
import os
import re
import tempfile
import traceback

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- 1. FASTAPI + CORS ---

web_app = FastAPI(title="Avatar TTS")

# En Modal esto es ["*"]. Aca se restringe al origen del MFE, que es el unico que llama
# de verdad. No es autenticacion (un curl se lo saltea), pero corta el abuso desde otras
# paginas. Para autenticacion real habria que proxear el TTS por el LMS, igual que se
# hizo con OpenRouter en /api/ficct/avatar/ask/.
_origins = os.environ.get("AVATAR_TTS_CORS_ORIGINS", "*")
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. MODELOS DE DATOS ---

VOICE_MAP = {
    "dora":  "ef_dora",   # Mujer
    "alex":  "em_alex",   # Hombre
    "santa": "em_santa",  # Hombre
}
DEFAULT_VOICE = "dora"


class SynthesisRequest(BaseModel):
    text: str
    voice: str = DEFAULT_VOICE


class Viseme(BaseModel):
    viseme: str
    start: float
    duration: float


class SynthesisResponse(BaseModel):
    audio_base64: str
    visemes: list[Viseme]


# --- 3. CARGA DE MODELOS ---

kokoro_pipeline = None
mms_model = None
mms_labels = None


def load_models():
    global kokoro_pipeline, mms_model, mms_labels

    import torch

    # Sin esto torch toma todos los cores y compite con uwsgi y Celery, que corren en
    # el mismo host. 0 = sin limite.
    threads = int(os.environ.get("AVATAR_TTS_THREADS", "4"))
    if threads > 0:
        torch.set_num_threads(threads)

    if kokoro_pipeline is None:
        from kokoro import KPipeline
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Cargando Kokoro en {device} ({torch.get_num_threads()} threads)...")
        kokoro_pipeline = KPipeline(lang_code='e', device=device)
        print("Kokoro listo")

    if mms_model is None:
        import torchaudio
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        bundle = torchaudio.pipelines.MMS_FA
        print(f"Cargando MMS_FA en {device}...")
        mms_model = bundle.get_model().to(device)
        mms_labels = bundle.get_labels(star=None)
        print("MMS_FA listo")


@web_app.on_event("startup")
def _startup():
    """Los modelos se cargan al arrancar, no en la primera peticion: asi el primer
    alumno que pregunte no paga los ~30 s de carga."""
    load_models()


# --- 4. TABLA FONEMA IPA -> VISEMA ---

PHONEME_TO_VISEME = {
    # Bilabiales -> B (labios juntos)
    'p': 'B', 'b': 'B', 'm': 'B',
    # Labiodentales -> F
    'f': 'F', 'v': 'F',
    # Dentales / alveolares -> D
    'd': 'D', 't': 'D', 'n': 'D', 'l': 'D',
    # Sibilantes -> C
    's': 'C', 'z': 'C', 'x': 'C',
    # Velares / vibrantes -> G
    'k': 'G', 'g': 'G', 'r': 'G', 'ɾ': 'G',
    # Vocales abiertas -> A
    'a': 'A', 'ɑ': 'A',
    # Vocales medias / anteriores -> E
    'e': 'E', 'ɛ': 'E', 'i': 'E', 'j': 'E',
    # Vocales cerradas / posteriores -> H
    'o': 'H', 'u': 'H', 'w': 'H',
}


def get_word_phonemes(word: str) -> list[str]:
    import subprocess
    try:
        result = subprocess.run(
            ['espeak-ng', '-v', 'es', '--ipa', '-q', word],
            capture_output=True, text=True, timeout=5,
        )
        ipa = re.sub(r'[ˈˌ.()\n\r ]', '', result.stdout.strip())
        phonemes = []
        i = 0
        while i < len(ipa):
            two = ipa[i:i + 2]
            if two in PHONEME_TO_VISEME:
                phonemes.append(two)
                i += 2
            elif ipa[i] in PHONEME_TO_VISEME:
                phonemes.append(ipa[i])
                i += 1
            else:
                i += 1
        return phonemes or ['a']
    except Exception:
        return ['a']


# --- 5. ALINEACION MMS_FA -> VISEMAS ---

def build_visemes(word_spans, words: list[str], ratio: float) -> list[Viseme]:
    visemes = []
    for word, spans in zip(words, word_spans):
        if not spans:
            continue
        word_start = spans[0].start * ratio
        word_end = (spans[-1].end + 1) * ratio
        duration = word_end - word_start
        if duration < 0.01:
            continue
        phonemes = get_word_phonemes(word)
        ph_dur = duration / len(phonemes)
        for j, ph in enumerate(phonemes):
            visemes.append(Viseme(
                viseme=PHONEME_TO_VISEME.get(ph, 'A'),
                start=round(word_start + j * ph_dur, 3),
                duration=round(ph_dur, 3),
            ))
    return visemes


def align_visemes(wav_path: str, text: str) -> list[Viseme]:
    import torch
    import soundfile as sf
    import torchaudio
    import torchaudio.functional as F

    device = "cuda" if torch.cuda.is_available() else "cpu"
    bundle = torchaudio.pipelines.MMS_FA

    data, sr = sf.read(wav_path, dtype='float32')
    waveform = torch.from_numpy(data).unsqueeze(0)
    if sr != bundle.sample_rate:
        waveform = torchaudio.functional.resample(waveform, sr, bundle.sample_rate)
    waveform = waveform.to(device)

    # Normalizar texto: solo a-z y espacios para el diccionario de MMS_FA
    text_norm = text.lower()
    text_norm = re.sub(r'[áä]', 'a', text_norm)
    text_norm = re.sub(r'[éë]', 'e', text_norm)
    text_norm = re.sub(r'[íï]', 'i', text_norm)
    text_norm = re.sub(r'[óö]', 'o', text_norm)
    text_norm = re.sub(r'[úüù]', 'u', text_norm)
    text_norm = re.sub(r'ñ', 'n', text_norm)
    text_norm = re.sub(r'[^a-z\s]', '', text_norm)

    words = text_norm.split()
    if not words:
        return []

    dictionary = {c: i for i, c in enumerate(mms_labels)}

    def tokenize(word):
        return [dictionary[c] for c in word if c in dictionary]

    word_tokens = [tokenize(w) for w in words]
    valid_pairs = [(w, t) for w, t in zip(words, word_tokens) if t]
    if not valid_pairs:
        return []
    words_valid, word_tokens_valid = zip(*valid_pairs)

    flat_tokens = [t for wt in word_tokens_valid for t in wt]
    word_lengths = [len(wt) for wt in word_tokens_valid]

    with torch.inference_mode():
        emission, _ = mms_model(waveform)

    targets = torch.tensor([flat_tokens], dtype=torch.int32, device=device)
    alignments, scores = F.forced_align(emission, targets, blank=0)
    alignments, scores = alignments[0], scores[0]
    scores = scores.exp()

    token_spans = F.merge_tokens(alignments, scores)

    word_spans = []
    i = 0
    for length in word_lengths:
        word_spans.append(token_spans[i:i + length])
        i += length

    ratio = waveform.shape[1] / emission.shape[1] / bundle.sample_rate
    return build_visemes(word_spans, list(words_valid), ratio)


# --- 6. ENDPOINTS ---

@web_app.post("/synthesize", response_model=SynthesisResponse)
async def synthesize_speech(request: SynthesisRequest):
    load_models()

    voice_key = (request.voice or DEFAULT_VOICE).lower()
    voice_id = VOICE_MAP.get(voice_key)
    if voice_id is None:
        raise HTTPException(
            status_code=400,
            detail=f"Voz '{request.voice}' no válida. Opciones: {list(VOICE_MAP.keys())}",
        )

    print(f"Sintetizando: '{request.text}' | voz: {voice_id}")
    wav_path = None

    try:
        import numpy as np
        import soundfile as sf

        audio_chunks = []
        for result in kokoro_pipeline(request.text, voice=voice_id, speed=1.0):
            audio_chunks.append(result[2])

        if not audio_chunks:
            raise ValueError("Kokoro no generó audio.")

        audio = np.concatenate(audio_chunks)

        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            wav_path = f.name
        sf.write(wav_path, audio, 24000)

        # Forced alignment con MMS_FA → visemas basados en el audio real
        visemes_list = align_visemes(wav_path, request.text)

        with open(wav_path, 'rb') as f:
            audio_base64 = base64.b64encode(f.read()).decode('utf-8')

        print(f">>> Listo | Visemas: {len(visemes_list)}")
        return SynthesisResponse(audio_base64=audio_base64, visemes=visemes_list)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {e}")

    finally:
        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)


@web_app.get("/")
def read_root():
    return {"status": "Servicio de Avatar TTS v3 en linea", "voices": list(VOICE_MAP.keys())}


@web_app.get("/voices")
def list_voices():
    return {"voices": VOICE_MAP}


@web_app.get("/health")
def health():
    """Para el healthcheck del contenedor: responde recien cuando los modelos cargaron."""
    ready = kokoro_pipeline is not None and mms_model is not None
    return {"ready": ready}
