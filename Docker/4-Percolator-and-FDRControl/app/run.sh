#!/bin/bash
percolator t_d.pin \
    -m output/out.target \
    -M output/out.decoy \
    -w output/out.weight \
    -Y -U -V SA
