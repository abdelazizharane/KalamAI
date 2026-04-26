FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 espeak-ng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install torch CPU-only via direct wheel URL (avoids --index-url + local version label issues)
RUN pip install --no-cache-dir --timeout 600 \
    "https://download.pytorch.org/whl/cpu/torch-2.3.0%2Bcpu-cp311-cp311-linux_x86_64.whl"

# Large ML packages in their own layer for better cache hits on retry
RUN pip install --no-cache-dir --timeout 600 \
    transformers==4.41.0 \
    faster-whisper==1.0.3 \
    accelerate==0.30.0

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 600 -r requirements.txt

COPY app/ ./app/
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
