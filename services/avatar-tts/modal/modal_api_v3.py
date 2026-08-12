# modal_api_v3.py
#
# Version desplegada en Modal (app `avatar-tts-api-v3`), que es la que sirve
# AVATAR_TTS_API_URL hoy. Se versiona tal cual: hasta ahora vivia solo en la PC.
#
# Redesplegar:  modal deploy modal_api_v3.py
#
# La version para correr en el propio servidor esta en ../app.py y comparte toda la
# logica. Si se toca la tabla de visemas o la normalizacion del espanol aca, hay que
# tocarla alla tambien.
import modal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import traceback
import tempfile
import os
import re

# --- 1. CONFIGURACIÓN DE INFRAESTRUCTURA EN MODAL ---

def download_models():
    import torch
    from kokoro import KPipeline
    KPipeline(lang_code='e')
    import torchaudio
    torchaudio.pipelines.MMS_FA.get_model()

imagen_tts = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("espeak-ng", "ffmpeg")
    .pip_install("numpy", "soundfile")
    .pip_install("fastapi[standard]", "kokoro>=0.9.4", "torch", "torchaudio", "pydantic")
    .run_function(download_models)
)

app = modal.App("avatar-tts-api-v3")

# --- 2. FASTAPI + CORS ---

web_app = FastAPI()

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. MODELOS DE DATOS ---

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

# --- 4. CARGA DE MODELOS ---

kokoro_pipeline = None
mms_model       = None
mms_labels      = None

def load_models():
    global kokoro_pipeline, mms_model, mms_labels

    if kokoro_pipeline is None:
        import torch
        from kokoro import KPipeline
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Cargando Kokoro en {device}...")
        kokoro_pipeline = KPipeline(lang_code='e', device=device)
        print("Kokoro listo")

    if mms_model is None:
        import torch
        import torchaudio
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        bundle = torchaudio.pipelines.MMS_FA
        print(f"Cargando MMS_FA en {device}...")
        mms_model  = bundle.get_model().to(device)
        mms_labels = bundle.get_labels(star=None)
        print("MMS_FA listo")

# --- 5. TABLA FONEMA IPA → VISEMA ---

PHONEME_TO_VISEME = {
    # Bilabiales → B (labios juntos)
    'p': 'B', 'b': 'B', 'm': 'B',
    # Labiodentales → F
    'f': 'F', 'v': 'F',
    # Dentales / alveolares → D
    'd': 'D', 't': 'D', 'n': 'D', 'l': 'D',
    # Sibilantes → C
    's': 'C', 'z': 'C', 'x': 'C',
    # Velares / vibrantes → G
    'k': 'G', 'g': 'G', 'r': 'G', 'ɾ': 'G',
    # Vocales abiertas → A
    'a': 'A', 'ɑ': 'A',
    # Vocales medias / anteriores → E
    'e': 'E', 'ɛ': 'E', 'i': 'E', 'j': 'E',
    # Vocales cerradas / posteriores → H
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
            two = ipa[i:i+2]
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

# --- 6. ALINEACIÓN MMS_FA → VISEMAS ---

def build_visemes(word_spans, words: list[str], ratio: float) -> list[Viseme]:
    visemes = []
    for word, spans in zip(words, word_spans):
        if not spans:
            continue
        word_start = spans[0].start * ratio
        word_end   = (spans[-1].end + 1) * ratio
        duration   = word_end - word_start
        if duration < 0.01:
            continue
        phonemes = get_word_phonemes(word)
        ph_dur   = duration / len(phonemes)
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

    word_tokens  = [tokenize(w) for w in words]
    valid_pairs  = [(w, t) for w, t in zip(words, word_tokens) if t]
    if not valid_pairs:
        return []
    words_valid, word_tokens_valid = zip(*valid_pairs)

    flat_tokens  = [t for wt in word_tokens_valid for t in wt]
    word_lengths = [len(wt) for wt in word_tokens_valid]

    with torch.inference_mode():
        emission, _ = mms_model(waveform)

    targets    = torch.tensor([flat_tokens], dtype=torch.int32, device=device)
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

# --- 7. ENDPOINT PRINCIPAL ---

@web_app.post("/synthesize", response_model=SynthesisResponse)
async def synthesize_speech(request: SynthesisRequest):
    load_models()

    voice_key = (request.voice or DEFAULT_VOICE).lower()
    voice_id  = VOICE_MAP.get(voice_key)
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
    return {"status": "Servicio de Avatar TTS v3 en línea", "voices": list(VOICE_MAP.keys())}

@web_app.get("/voices")
def list_voices():
    return {"voices": VOICE_MAP}

# --- 8. DESPLIEGUE EN MODAL ---

@app.function(
    image=imagen_tts,
    gpu="T4",
    scaledown_window=300,
    retries=1,
)
@modal.asgi_app(startup=load_models)
def fastapi_app():
    return web_app
