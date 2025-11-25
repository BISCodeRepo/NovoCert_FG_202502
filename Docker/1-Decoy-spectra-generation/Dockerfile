FROM eclipse-temurin:21-jre-alpine

# setup folders
ARG HOME_DIR=/app
ENV INPUT_DIR=${HOME_DIR}/input \
    OUTPUT_DIR=${HOME_DIR}/output

RUN mkdir -p ${HOME_DIR} ${INPUT_DIR} ${OUTPUT_DIR}

WORKDIR ${HOME_DIR}

# copy excution file
COPY ./app/ .

# Environment variables for running
ENV MEMORY=4 \
    PRECURSOR_TOLERANCE=20 \
    RANDOM_SEED=100

# Run PrecursorSwap.jar
CMD [ "sh", "run.sh" ]