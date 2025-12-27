#!/bin/bash
/venv/bin/casanovo sequence data/mgf/spectra.mgf \
    --model data/model.ckpt \
    --config data/casanovo.yaml \
    --output_dir output/