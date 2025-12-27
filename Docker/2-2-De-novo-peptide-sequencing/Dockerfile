FROM python:3.13-slim AS builder

RUN apt update \
    && apt install -y gcc g++ gdb \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN python -m venv /venv
RUN /venv/bin/pip install --no-cache-dir casanovo

FROM python:3.13-slim

COPY --from=builder /venv /venv

RUN apt update \
    && apt install -y --no-install-recommends \
    libxrender1 libxext6 libexpat1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY ./app /app

CMD [ "bash", "run.sh" ]