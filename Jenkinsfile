pipeline {
//    agent {label 'node-01'}
    agent any
    tools {nodejs "node"}
    options {
    timeout(time: 20, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '30'))
    }
    environment {

        RECEIPIENTS           = 'v-harish.thumma@tensorgo.com'
        REGION                = 'arc-dev'
        WORKSPACE             = '/home/jenkins/arc-service'
        REACTENV              = 'dev'
        ENVFILE               = 'testing'
        
    }

    stages {
        stage('Arc-Service-Dev'){
            agent {
                // node {
                    label "${REGION}"
                //     customWorkspace "${WORKSPACE}"
                // }
            }
            steps{
                script {
                    // Define Variable
                        emailext body: "Build URL: ${env.BUILD_URL}.\n\n",
                        to: "${RECEIPIENTS}",                        
                        subject: "${env.JOB_NAME} #${env.BUILD_NUMBER}" + 'waiting for your input'
                        userInput = input(
                            id: 'buildMethod', 
                            message: 'Proceed or Abort?', 
                            parameters: [
                                choice(
                                    name: 'Deployment', 
                                        choices: [
                                        'Yes', 
                                        'No'
                                    ], 
                                    description: 'Choose your Option'
                                )
                            ]
                        )
                        if(userInput == 'Yes'){
                            deployProduct = true
                            sh '''
                            npm i
                            npm install -g pm2
                            npm run build
                            cp -rf environments/"${ENVFILE}".env .env
                            pm2 delete -s arc-service || :
                            pm2 start build/index.js --name arc-service
                            '''
                        }else{    
                        echo "Aborted by: [${user}]"
                        }
                }
            }
        }
    }
    post {
        always {
            script {
                emailext (
                to: "${RECEIPIENTS}",
                subject: "${env.JOB_NAME} #${env.BUILD_NUMBER} [${currentBuild.result}]",
                body: "Build URL: ${env.BUILD_URL}.\n\n",
                attachLog: true,
                )
                // echo 'Testing TensorGo Jenkins Build status'            
                // emailext body: "${currentBuild.currentResult}: Job ${env.JOB_NAME} build ${env.BUILD_NUMBER}\n More info at: ${env.BUILD_URL}",
                // recipientProviders: [[$class: 'DevelopersRecipientProvider'], [$class: 'RequesterRecipientProvider']],
                // subject: "Jenkins Build ${currentBuild.currentResult}: Job ${env.JOB_NAME}" 
                // attachLog: true
            }           
        }
    }
}
     

