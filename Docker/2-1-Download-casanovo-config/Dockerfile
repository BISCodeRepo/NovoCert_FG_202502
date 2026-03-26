FROM python:3.13 AS builder

RUN pip install --no-cache-dir torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir casanovo==4.3.0

WORKDIR /app

CMD ["casanovo", "configure", "--output", "output/casanovo.yaml"]