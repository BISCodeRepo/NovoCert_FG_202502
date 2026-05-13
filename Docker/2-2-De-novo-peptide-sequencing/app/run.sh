#!/bin/bash
set -euo pipefail

export NOVOCERT_CPU_THREADS="${NOVOCERT_CPU_THREADS:-$(nproc)}"
export NOVOCERT_INTEROP_THREADS="${NOVOCERT_INTEROP_THREADS:-1}"
export OMP_NUM_THREADS="$NOVOCERT_CPU_THREADS"
export MKL_NUM_THREADS="$NOVOCERT_CPU_THREADS"
export OPENBLAS_NUM_THREADS="$NOVOCERT_CPU_THREADS"
export NUMEXPR_NUM_THREADS="$NOVOCERT_CPU_THREADS"

echo "Using PyTorch CPU threads: ${NOVOCERT_CPU_THREADS}, inter-op threads: ${NOVOCERT_INTEROP_THREADS}"
python -c "import os, sys, torch; torch.set_num_threads(int(os.environ['NOVOCERT_CPU_THREADS'])); torch.set_num_interop_threads(int(os.environ['NOVOCERT_INTEROP_THREADS'])); sys.argv=['casanovo','sequence','data/mgf/spectra.mgf','--model','data/model.ckpt','--config','data/casanovo.yaml','--output','output/result.mztab']; from casanovo.casanovo import main; main()"
