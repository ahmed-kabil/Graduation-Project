#!/bin/bash

set -e

echo "🧹 Deleting old workloads..."
kubectl delete -f ingress.yml --ignore-not-found=true
kubectl delete -f frontend.yml --ignore-not-found=true
kubectl delete -f chat-service.yml --ignore-not-found=true
kubectl delete -f iot-service.yml --ignore-not-found=true
kubectl delete -f core-service.yml --ignore-not-found=true
kubectl delete -f auth-service.yml --ignore-not-found=true
kubectl delete -f chatbot.yml --ignore-not-found=true
kubectl delete -f mongodb.yml --ignore-not-found=true
kubectl delete -f tls-secret.yml --ignore-not-found=true
kubectl delete -f secret.yml --ignore-not-found=true
kubectl delete -f config-map.yml --ignore-not-found=true
