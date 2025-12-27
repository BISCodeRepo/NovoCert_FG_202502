FROM ubuntu:24.04

WORKDIR /tmp
ADD https://github.com/percolator/percolator/releases/download/rel-3-07-01/percolator-noxml-v3-07-linux-amd64.deb percolator-noxml.deb
ADD https://github.com/percolator/percolator/releases/download/rel-3-07-01/percolator-converters-v3-07-linux-amd64.deb percolator-converters.deb

RUN apt-get update && apt-get install -y \
    libgomp1 \
    ./percolator-noxml.deb \
    ./percolator-converters.deb \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app
COPY ./app/ /app

CMD [ "bash", "run.sh" ]