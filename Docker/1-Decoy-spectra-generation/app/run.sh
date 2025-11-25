#!/bin/sh

echo ======= arguments =======
echo MEMORY: ${MEMORY}G
echo PRECURSOR_TOLERANCE: ${PRECURSOR_TOLERANCE}
echo RANDOM_SEED: ${RANDOM_SEED}
echo =========================
echo 

java \
    -Xmx${MEMORY}G \
    -jar PrecursorSwap.jar \
    -i ${INPUT_DIR} \
    -o ${OUTPUT_DIR} \
    -d ${PRECURSOR_TOLERANCE} \
    -r ${RANDOM_SEED}