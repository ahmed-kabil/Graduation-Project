pipeline {
    agent any

    environment {
        DOCKER_HUB_USERNAME = 'ebrahimmohammed'
        IMAGE_TAG = 'latest'

        AUTH_IMAGE = "${DOCKER_HUB_USERNAME}/hospital-auth-service"
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

        stage('Build Auth Service Image') {
            steps {
                sh '''
                    docker build -t $AUTH_IMAGE:$IMAGE_TAG ./services/auth-service
                '''
            }
        }

        stage('Push Image') {
            steps {
                sh '''
                    docker push $AUTH_IMAGE:$IMAGE_TAG
                '''
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
    }
}
