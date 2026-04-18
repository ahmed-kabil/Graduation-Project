pipeline {
    agent any

    environment {
        // بيانات Docker Hub
        DOCKER_HUB_USERNAME = 'ebrahimmohammed'
        IMAGE_TAG = 'latest'

        // أسماء الصور (Images) - موحدة مع ملف الـ Compose
        AUTH_IMAGE    = "${DOCKER_HUB_USERNAME}/hospital-auth-service"
        CORE_IMAGE    = "${DOCKER_HUB_USERNAME}/hospital-core-service"
        IOT_IMAGE     = "${DOCKER_HUB_USERNAME}/hospital-iot-service"
        CHAT_IMAGE    = "${DOCKER_HUB_USERNAME}/hospital-chat-service"
        BOT_IMAGE     = "${DOCKER_HUB_USERNAME}/hospital-medical-chatbot"
        FRONT_IMAGE   = "${DOCKER_HUB_USERNAME}/hospital-frontend"
        GATEWAY_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-gateway"

        // تعريف الـ Credentials IDs
        DOCKER_CREDS_ID = 'dockerhub-creds'
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main', url: 'https://github.com/Ibrahim131313/Graduation-Project.git'
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                }
            }
        }

        stage('Build & Push Services') {
            steps {
                script {
                    // بناء ورفع الصور لكل الخدمات
                    sh 'docker build -t $AUTH_IMAGE:$IMAGE_TAG ./services/auth-service'
                    sh 'docker push $AUTH_IMAGE:$IMAGE_TAG'
                    
                    sh 'docker build -t $CORE_IMAGE:$IMAGE_TAG ./services/core-service'
                    sh 'docker push $CORE_IMAGE:$IMAGE_TAG'
                    
                    sh 'docker build -t $IOT_IMAGE:$IMAGE_TAG ./services/iot-service'
                    sh 'docker push $IOT_IMAGE:$IMAGE_TAG'

                    sh 'docker build -t $CHAT_IMAGE:$IMAGE_TAG ./services/chat-service'
                    sh 'docker push $CHAT_IMAGE:$IMAGE_TAG'

                    sh 'docker build -t $BOT_IMAGE:$IMAGE_TAG ./Medical-ChatBot-main'
                    sh 'docker push $BOT_IMAGE:$IMAGE_TAG'

                    sh 'docker build -t $FRONT_IMAGE:$IMAGE_TAG -f ./frontend/Dockerfile.microservices ./frontend'
                    sh 'docker push $FRONT_IMAGE:$IMAGE_TAG'

                    sh 'docker build -t $GATEWAY_IMAGE:$IMAGE_TAG ./nginx'
                    sh 'docker push $GATEWAY_IMAGE:$IMAGE_TAG'
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                withCredentials([
                    string(credentialsId: 'JWT_SECRET_KEY', variable: 'JWT_SECRET_KEY'),
                    string(credentialsId: 'PINECONE_API_KEY', variable: 'PINECONE_API_KEY'),
                    string(credentialsId: 'GOOGLE_API_KEY', variable: 'GOOGLE_API_KEY'),
                    string(credentialsId: 'GEMINI_API_KEYS', variable: 'GEMINI_API_KEYS'),
                    string(credentialsId: 'GROQ_API_KEY', variable: 'GROQ_API_KEY')
                ]) {
                    script {
                        echo "🚀 Forces Deployment using Standalone Docker-Compose..."
                        sh """
                            export JWT_SECRET_KEY='${JWT_SECRET_KEY}'
                            export PINECONE_API_KEY='${PINECONE_API_KEY}'
                            export GOOGLE_API_KEY='${GOOGLE_API_KEY}'
                            export GEMINI_API_KEYS='${GEMINI_API_KEYS}'
                            export GROQ_API_KEY='${GROQ_API_KEY}'
                            export IMAGE_TAG='${IMAGE_TAG}'

                            # استدعاء مباشر للمسار اللي سطبناه لضمان عدم حدوث تعارض flags
                            /usr/local/bin/docker-compose --file ./docker-compose.prod.yml pull
                            /usr/local/bin/docker-compose --file ./docker-compose.prod.yml up -d --remove-orphans
                        """
                        echo "✅ Deployment completed successfully!"
                    }
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
            // مسح الصور القديمة لتوفير مساحة على الـ EC2
            sh 'docker image prune -f'
        }
        success {
            echo '🎉 Smart Hospital System is UP and RUNNING!'
        }
        failure {
            echo '❌ Deployment failed. Check the logs.'
        }
    }
}
