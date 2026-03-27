FROM python:3.12

RUN pip install --no-cache-dir torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir casanovo==4.3.0

WORKDIR /app
COPY ./app /app

CMD [ "bash", "run.sh" ]