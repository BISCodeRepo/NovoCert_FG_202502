FROM python:3.13 AS builder

RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir casanovo==4.3.0

WORKDIR /app

CMD ["casanovo", "configure", "--output", "output/casanovo.yaml"]