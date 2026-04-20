#! /bin/bash
docker build -t hospital-frontend-image:latest ../frontend/
docker save hospital-frontend-image:latest > frontend-image.tar
sudo ctr - n k8s.io image import hospital-frontend-image:latest

kubectl apply -f storage-class.yml
kubectl apply -f namespace.yml
kubectl apply -f config-map.yml
kubectl apply -f secret.yml
kubectl apply -f tls-secret.yml
kubectl apply -f mongodb.yml
kubectl apply -f chatbot.yml
kubectl apply -f auth-service.yml
kubectl apply -f core-service.yml
kubectl apply -f iot-service.yml
kubectl apply -f chat-service.yml
kubectl apply -f frontend.yml
kubectl apply -f ingress.yml