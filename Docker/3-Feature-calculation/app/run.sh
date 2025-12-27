#!/bin/bash
/venv/bin/python feature_calculation.py \
    --target_mgf_dir target/mgf/ \
    --target_result_path target/result.mztab \
    --decoy_mgf decoy/mgf/ \
    --decoy_result_path decoy/result.mztab \
    --output_dir output
