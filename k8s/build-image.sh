#! /bin/bash

docker build -t ahmedkabil/hospital-metric-servo-service:latest ../5-metric_servo_service/
docker save ahmedkabil/hospital-metric-servo-service:latest > metric_servo-image.tar
sudo ctr -n k8s.io images import metric_servo-image.tar
rm -rf metric_servo-image.tar