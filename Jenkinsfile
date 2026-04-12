pipeline {
    agent any

    environment {
        DOCKER_HUB_USERNAME = 'ebrahimmohammed'
        IMAGE_TAG = 'latest'

        AUTH_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-auth-service"
        CORE_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-core-service"
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
        // Build Stage
        // =========================
        stage('Build Auth Image') {
            steps {
                sh '''
                    docker build -t $AUTH_IMAGE:$IMAGE_TAG ./services/auth-service
                '''
            }
        }

        stage('Build Core Image') {
            steps {
                sh '''
                    docker build -t $CORE_IMAGE:$IMAGE_TAG ./services/core-service
                '''
            }
        }

        // =========================
        // Push Stage
        // =========================
        stage('Push Auth Image') {
            steps {
                sh '''
                    docker push $AUTH_IMAGE:$IMAGE_TAG
                '''
            }
        }

        stage('Push Core Image') {
            steps {
                sh '''
                    docker push $CORE_IMAGE:$IMAGE_TAG
                '''
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
        success {
            echo '✅ Auth & Core images built and pushed successfully!'
        }
        failure {
            echo '❌ Pipeline failed. Check logs.'
        }
    }
}
