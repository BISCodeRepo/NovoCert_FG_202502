#!/bin/bash
percolator t_d.pin \
    -m output/out.target \
    -M output/out.decoy \
    -w output/out.weight \
    -Y -U -V SA \
    --trainFDR 0.001

python3 fdr_control.py \
    --fdr_type ${FDR_TYPE} \
    --target_path output/out.target \
    --decoy_path output/out.decoy \
    --fdr_rate ${FDR} \
    --output_dir output