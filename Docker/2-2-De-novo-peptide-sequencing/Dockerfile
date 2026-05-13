FROM python:3.12

LABEL org.opencontainers.image.version="1.2.2"

ENV TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

RUN pip install --no-cache-dir torch==2.11.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir \
        casanovo==4.3.0 \
        depthcharge-ms==0.2.3

WORKDIR /app
COPY ./app /app

CMD [ "bash", "run.sh" ]
