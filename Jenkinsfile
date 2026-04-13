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
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                    '''
                }
            }
        }

        // =========================
        // AUTH SERVICE
        // =========================
        stage('Build Auth Service') {
            steps {
                sh 'docker build -t $AUTH_IMAGE:$IMAGE_TAG ./services/auth-service'
            }
        }

        stage('Push Auth Service') {
            steps {
                sh 'docker push $AUTH_IMAGE:$IMAGE_TAG'
            }
        }

        // =========================
        // CORE SERVICE
        // =========================
        stage('Build Core Service') {
            steps {
                sh 'docker build -t $CORE_IMAGE:$IMAGE_TAG ./services/core-service'
            }
        }

        stage('Push Core Service') {
            steps {
                sh 'docker push $CORE_IMAGE:$IMAGE_TAG'
            }
        }

        // =========================
        // IOT SERVICE
        // =========================
        stage('Build IoT Service') {
            steps {
                sh 'docker build -t $IOT_IMAGE:$IMAGE_TAG ./services/iot-service'
            }
        }

        stage('Push IoT Service') {
            steps {
                sh 'docker push $IOT_IMAGE:$IMAGE_TAG'
            }
        }

        // =========================
        // CHAT SERVICE
        // =========================
        stage('Build Chat Service') {
            steps {
                sh 'docker build -t $CHAT_IMAGE:$IMAGE_TAG ./services/chat-service'
            }
        }

        stage('Push Chat Service') {
            steps {
                sh 'docker push $CHAT_IMAGE:$IMAGE_TAG'
            }
        }

        // =========================
        // MEDICAL CHATBOT
        // =========================
        stage('Build Medical ChatBot') {
            steps {
                sh 'docker build -t $BOT_IMAGE:$IMAGE_TAG ./Medical-ChatBot-main'
            }
        }

        stage('Push Medical ChatBot') {
            steps {
                sh 'docker push $BOT_IMAGE:$IMAGE_TAG'
            }
        }

        // =========================
        // FRONTEND
        // =========================
        stage('Build Frontend') {
            steps {
                sh '''
                docker build -t $FRONT_IMAGE:$IMAGE_TAG \
                -f ./frontend/Dockerfile.microservices ./frontend
                '''
            }
        }

        stage('Push Frontend') {
            steps {
                sh 'docker push $FRONT_IMAGE:$IMAGE_TAG'
            }
        }

        // =========================
        // NGINX GATEWAY
        // =========================
        stage('Build Gateway') {
            steps {
                sh 'docker build -t $GATEWAY_IMAGE:$IMAGE_TAG ./nginx'
            }
        }

        stage('Push Gateway') {
            steps {
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
}
