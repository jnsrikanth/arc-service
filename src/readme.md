    # Enviroment setup and installtion of project

    Install Node Js 12.16.1, This is they same version which is well tested while developing the project.
    Install yarn or npm package manager, throught this document we will be making use of command based on yarn package manager,However npm can also be user.

    # Technology Stack Used:

    1 Typescript.
    2 Node Js.
    3 Express Js Framework.
    4 Sequelize DB

    # Environment Setup:
    Install node latest stable version and the time of development, the version used is 12.16.1.
    # Install yarn package manager. 
    The project is configured with typescript, please use tsconfig.js to make any changes in configuration, however no configuration changes are required.

    # Running the project:
    Go inside project root directory, where package.json file is present and execute following commands:
    npm run dev

    # Building the project:
    Go inside project root directory, where package.json file is present and execute following commands:
    npm run build
    The above command will create optimized build present inside build directory.


    # Deploying the project:
    After successfully build, do the following:
    Push all the changes in local to master.
    Go to Faceit Ec2 Instance.
    Go inside sec/sec-service/
    Run command - git pull
    Run command - yarn
    Run command - npm run build
    Copy respective environments/*.env file as .env to repository root
    Run command - pm2 start build/index.js
    (**Make sure pm2 is installed globally using npm i pm2 -g)


    # Project Structure:
    The project is created with the help of next js so that advanced features like ssr and optimization of production build, optimized routing can be integrated easily.
    
    src >
        api_models > 
            *_models.ts
        api_routes >
            *_routes.ts
        config >
            config.ts >
        
        datasources >
            *Datasources.ts

        sec_db >  
            models >
                *.ts //All Sequelize model files
            4.ts
        
        socket_listners >
            socket_listener.ts
        Utils >
            *-utility files and packages
    .env - file for enviroment configuration


    a.) api_models  : Contain template files for request and response for different api paths. Each file will contain request and response template for specified file.

    b.) api_routes : The directory will contain different router specific to each module, like auth, videos, images etc. Each file will contain at most
    one router and each router file will return one router which will contain paths specific to that module.

    c.) config: This will contains file specific to project configuration and the main config file will contain configuration as per enviroment variables, the enviorment variables can be accessed using process.env and we can make use of .env file to inflate enviroment variabl.

    d.) datasources: This will contain all the required datasources used in our application and each datasource will contain logic for making mutations and query to the datasources. 

    e.) sec_db: The directory will contain code for initializing the database, the directory will have sub folder called model, the model directory will contain all the model files for the database. Each model file represent a table in database and attribute of model class will define the columns. For more information regarding implementation of models via typescript please refer typescript.

    f.) socket_listners: Contains socket listner class which contain code for creating socket connection, this code is required to send the continuos 
    machine learning processing updates from server to client. 

    g.) utils: This folder contains all the utility files, functions and constants required across the project.

    h.) .env: This file contain the enviroment variables, this file must needed to be in sync with app_config file under the config directory.


