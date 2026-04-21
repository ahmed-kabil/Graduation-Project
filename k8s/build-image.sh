#! /bin/bash

docker build -t hospital-frontend-image:latest ../frontend/
docker save hospital-frontend-image:latest > frontend-image.tar
sudo ctr - n k8s.io image import hospital-frontend-image:latest
rm -rf frontend-image.tar