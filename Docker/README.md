# NovoCert Docker Usage Guide

This directory contains Docker Compose configurations for running the NovoCert pipeline. The pipeline is divided into several steps, each contained within its own folder.

## Prerequisites

- Docker installed on your system.
- Necessary input data files for the pipeline.

## Usage Instructions

To run each step of the pipeline, follow these general instructions for each directory:

1. **Navigate to the target folder**:
   Go into the directory for the step you want to execute (e.g., `1-Decoy-spectra-generation`).

2. **Update the Docker Image Name and Tag**:
   Open the `docker-compose.yml` (or `compose.yml`) file in the folder. Locate the `image` field, prepend `huswim/` to the beginning of the image name, and either remove the existing image tag or change it to `latest`.

   *Example:*

   ```yaml
   services:
     app:
       image: huswim/novocert-p1:latest  # Prepend 'huswim/' and change tag to 'latest'
   ```

3. **Configure Environment Variables and Volumes**:
   In the same `docker-compose.yml` file, update the environment variables and volume mount paths to match your local system paths and data locations.

   *Example:*

   ```yaml
       environment:
         - SOME_VAR=your_value
       volumes:
         - /path/to/your/local/data:/data  # Update with your local path
   ```

4. **Execute Docker Compose**:
   Run the following command in your terminal from within the step's folder to start the process:

   ```bash
   docker compose up
   ```

## Pipeline Steps

The pipeline consists of the following steps, which are intended to be executed in sequence:

1. **`1-Decoy-spectra-generation`**: Generates decoy spectra.
2. **`2-1-Download-casanovo-config`**: Downloads the appropriate Casanovo configuration files.
3. **`2-2-De-novo-peptide-sequencing`**: Performs de novo peptide sequencing.
4. **`3-Feature-calculation`**: Calculates required features for processing.
5. **`4-Percolator-and-FDRControl`**: Runs Percolator and controls the False Discovery Rate (FDR).
