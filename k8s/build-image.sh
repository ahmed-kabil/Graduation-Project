#! /bin/bash

docker build -t hospital-frontend-image:latest ../frontend/
docker save hospital-frontend-image:latest > frontend-image.tar
sudo ctr -n k8s.io images import frontend-image.tar
rm -rf frontend-image.tar