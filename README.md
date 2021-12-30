# mock-stock-trading-service

## Description

Node.js/Express backend with Pug as the template engine and MongoDB/mongoose as the database. 

This mock stock trading service uses a Price-Time Priority algorithm to match buy & sell orders for a particular stock ticker. It uses the findOneAndUpdate method available from the mongodb driver to prevent race conditions by atomically finding and updating the quantity if it finds a matching order. 

Homepage is located at http://localhost:3000/

A test.rest file is provided for reference if REST Client extension, Postman or equivalent is already installed for testing of REST endpoints.

## Initial Set-Up

node_modules excluded from .gitignore so `npm install` not required.
Install MongoDB if not previously installed.

## Available Scripts 

`npm run server` to start running server.
`npm run test` to start mocha tests. 
