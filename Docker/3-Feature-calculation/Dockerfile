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

CMD [ "/venv/bin/python", "feature_calculation.py", "--target_mgf_dir", "target/mgf/", "--target_result_path", "target/result.mztab", "--decoy_mgf_dir", "decoy/mgf/", "--decoy_result_path", "decoy/result.mztab", "--output_dir", "output" ]