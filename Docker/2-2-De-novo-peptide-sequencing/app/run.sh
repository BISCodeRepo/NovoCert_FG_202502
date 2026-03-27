#!/bin/bash
casanovo sequence data/mgf/spectra.mgf \
    --model data/model.ckpt \
    --config data/casanovo.yaml \
    --output output/result.mztab