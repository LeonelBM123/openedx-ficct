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

# Equivalente al run_function(download_models) de Modal: los pesos quedan horneados en
# la imagen. Sin esto, el primer arranque en el servidor nuevo se cuelga bajando modelos.
RUN python -c "\
from kokoro import KPipeline; KPipeline(lang_code='e'); \
import torchaudio; torchaudio.pipelines.MMS_FA.get_model()"

# Cuantos threads puede usar torch. El default deja 4 de los 8 cores libres para
# uwsgi, Celery, MySQL y Mongo, que comparten el host.
ENV AVATAR_TTS_THREADS=4

EXPOSE 80
CMD ["uvicorn", "app:web_app", "--host", "0.0.0.0", "--port", "80"]
