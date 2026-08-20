# Servicio de voz del avatar, para correr en el mismo host que Tutor.
#
# Se usa la rueda CPU de torch a proposito: la variante con CUDA arrastra ~2.5 GB de
# librerias de NVIDIA que en un servidor sin GPU no sirven para nada.
FROM python:3.10-slim

# espeak-ng: fonemas IPA para la tabla de visemas.
# ffmpeg y libsndfile1: lectura/escritura de audio (soundfile, torchaudio).
RUN apt-get update && apt-get install -y --no-install-recommends \
        espeak-ng \
        ffmpeg \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Hornea los pesos en la imagen sintetizando de verdad con cada voz -- no alcanza con
# instanciar KPipeline: Kokoro baja el archivo de cada voz de HuggingFace la primera
# vez que se usa, de forma perezosa. Sin esto el bake deja el modelo base cargado pero
# la primera peticion real de cada voz sigue dependiendo de internet en el servidor
# nuevo, con un pico de latencia y un fallo silencioso si no hay salida a internet.
# Ejercita tambien el camino completo de MMS_FA + espeak-ng: si falta una dependencia
# el build falla ruidosamente en vez de fallarle a un alumno.
RUN python -c "\
from kokoro import KPipeline; \
import torchaudio; torchaudio.pipelines.MMS_FA.get_model(); \
pipeline = KPipeline(lang_code='e'); \
[list(pipeline('Hola, esto es una prueba.', voice=v, speed=1.0)) for v in ('ef_dora', 'em_alex', 'em_santa')]"

# Cuantos threads puede usar torch durante una sintesis (no es una reserva de CPUs: en
# reposo el proceso no usa nada). El default deja margen para uwsgi, Celery, MySQL y
# Mongo, que comparten el host.
ENV AVATAR_TTS_THREADS=4
ENV AVATAR_TTS_CACHE_DIR=/cache
VOLUME ["/cache"]

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD python -c "\
import urllib.request, sys; \
sys.exit(0 if b'true' in urllib.request.urlopen('http://localhost:80/health', timeout=3).read() else 1)"

CMD ["uvicorn", "app:web_app", "--host", "0.0.0.0", "--port", "80"]
