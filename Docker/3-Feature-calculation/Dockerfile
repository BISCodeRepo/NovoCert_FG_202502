FROM python:3.10 AS builder

RUN python -m venv /venv
RUN /venv/bin/pip install ms2rescore plotly

RUN /venv/bin/python -c "import ms2pip; ms2pip.download_models(['HCD'])"

FROM python:3.10-slim

COPY --from=builder /venv /venv
COPY --from=builder /root/.ms2pip /root/.ms2pip

WORKDIR /app
RUN mkdir -p target/mgf decoy/mgf output
COPY ./app/ /app

CMD [ "bash", "run.sh" ]