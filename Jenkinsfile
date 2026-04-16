pipeline {
    agent any

    environment {
        DOCKER_HUB_USERNAME = 'ebrahimmohammed'
        IMAGE_TAG = 'latest'

        AUTH_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-auth-service"
        CORE_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-core-service"
        IOT_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-iot-service"
        CHAT_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-chat-service"
        BOT_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-medical-chatbot"
        FRONT_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-frontend"
        GATEWAY_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-gateway"
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main', url: 'https://github.com/Ibrahim131313/Graduation-Project.git'
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                }
            }
        }

        stage('Build & Push Auth Service') {
            steps {
                sh 'docker build -t $AUTH_IMAGE:$IMAGE_TAG ./services/auth-service'
                sh 'docker push $AUTH_IMAGE:$IMAGE_TAG'
            }
        }

        stage('Build & Push Core Service') {
            steps {
                sh 'docker build -t $CORE_IMAGE:$IMAGE_TAG ./services/core-service'
                sh 'docker push $CORE_IMAGE:$IMAGE_TAG'
            }
        }

        stage('Build & Push IoT Service') {
            steps {
                sh 'docker build -t $IOT_IMAGE:$IMAGE_TAG ./services/iot-service'
                sh 'docker push $IOT_IMAGE:$IMAGE_TAG'
            }
        }

        stage('Build & Push Chat Service') {
            steps {
                sh 'docker build -t $CHAT_IMAGE:$IMAGE_TAG ./services/chat-service'
                sh 'docker push $CHAT_IMAGE:$IMAGE_TAG'
            }
        }

        stage('Build & Push Medical ChatBot') {
            steps {
                sh 'docker build -t $BOT_IMAGE:$IMAGE_TAG ./Medical-ChatBot-main'
                sh 'docker push $BOT_IMAGE:$IMAGE_TAG'
            }
        }

        stage('Build & Push Frontend') {
            steps {
                sh 'docker build -t $FRONT_IMAGE:$IMAGE_TAG -f ./frontend/Dockerfile.microservices ./frontend'
                sh 'docker push $FRONT_IMAGE:$IMAGE_TAG'
            }
        }

        stage('Build & Push Gateway') {
            steps {
                sh 'docker build -t $GATEWAY_IMAGE:$IMAGE_TAG ./nginx'
                sh 'docker push $GATEWAY_IMAGE:$IMAGE_TAG'
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
        success {
            echo '✅ All images built and pushed successfully!'
        }
        failure {
            echo '❌ Pipeline failed. Check logs.'
        }
    }
} // نهاية الـ Pipeline
