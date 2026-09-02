# Gateway del LLM local del avatar, para correr en el mismo host que Tutor. Mucho mas
# liviano que services/avatar-tts: no carga modelos propios, solo reenvia a Ollama
# (contenedor "avatar-llm"), asi que no hace falta hornear nada en el build.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "\
import urllib.request, sys; \
sys.exit(0 if b'true' in urllib.request.urlopen('http://localhost:80/health', timeout=3).read() else 1)"

CMD ["uvicorn", "app:web_app", "--host", "0.0.0.0", "--port", "80"]
