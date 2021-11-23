process.env.NODE_ENV = 'test';
process.env.NUM_CPU = 1;

const assert = require('assert');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/app');
const should = chai.should();
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const serverURL = "http://localhost:3000";


chai.use(chaiHttp);
let order_id;

describe('Trading', function() {
    before(function(done) {
        Order.deleteMany({}, (err) => {
           done();
        });
    });

    before(function(done) {
        Transaction.deleteMany({}, (err) => {
            done();
         });
    });

    describe('GET order', function() {
        it('should GET all orders', function(done) {
          chai.request(serverURL)
              .get('/orders/JSON/')
              .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    res.body.length.should.be.eql(0);
                    done();
              });
        });
    });

    describe('GET transaction', function() {
        it('should GET all transactions', function(done) {
          chai.request(serverURL)
              .get('/transactions/JSON/')
              .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    res.body.length.should.be.eql(0);
                done();
              });
        });
    });

    describe('POST incorrect order', function() {
        it('should not POST an order with an incorrect field', function(done) {
            const order = {
                incorrect_field: "incorrect"
            }
            chai.request(serverURL)
                .post('/')
                .send(order)
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.a('object');
                    done();
            });
        });
    });

    describe('POST incorrect order', function() {
        it('should not POST an order with a missing required field (price)', 
            function(done) {
                const order = {
                    user_id: 'test-user',
                    stock_symbol: 'TEST',
                    order_type: 'buy',
                    units: 50,
                };
                chai.request(serverURL)
                    .post('/')
                    .send(order)
                    .end((err, res) => {
                        res.should.have.status(400);
                        res.body.should.be.a('object');
                        done();
            });
        });
    });

    // Existing orders: None
    // New Order: Buy 50 @ $1000 
    describe('POST correct order', function() {
        it('should POST an order with all fields as required', function(done) {
            const order = new Order({
                user_id: 'test-user',
                stock_symbol: 'TEST',
                order_type: 'buy',
                units: 50,
                price: 1000,
            });
            chai.request(serverURL)
                .post('/')
                .send(order)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
            });
        });
    });

    // Existing orders: Buy 50 @ $1000 
    // New Order: None
    describe('GET order', function() {
        it('should GET all orders', function(done) {
            chai.request(serverURL)
                .get('/orders/JSON/')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    res.body.length.should.be.eql(1);
                    done();
                });
        });
    });

    // Existing orders: Buy 50 @ $1000 
    // New Order: Sell 40 at $1000
    describe('Pairing order when existing order units > new order units', function() {
        it('existing order should be partially filled and new order filled', function(done) {
            const order = new Order({
                user_id: 'test-user',
                stock_symbol: 'TEST',
                order_type: 'sell',
                units: 40,
                price: 1000,
            });
            chai.request(serverURL)
                .post('/')
                .send(order)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
            });
        });
    });

    // Existing transactions: 40 @ $1000 
    describe('GET transaction', function() {
        it('expecting 1 transaction', function(done) {
            chai.request(serverURL)
                .get('/transactions/JSON/')
                .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('array');
                        res.body.length.should.be.eql(1);
                        // Transactions sorted by new, so we can always access newest
                        // entry using an index of 0
                        res.body[0].price.should.be.eql(1000);
                        res.body[0].units.should.be.eql(40);
                        done();
                });
        });
    });

    // Existing orders: Buy 10 @ $1000 
    // New Order: Sell 30 at $900
    describe('Pairing order when existing order units > new order units', function() {
        it('existing order should be partially filled and new order filled', function(done) {
            const order = new Order({
                user_id: 'test-user',
                stock_symbol: 'TEST',
                order_type: 'sell',
                units: 30,
                price: 900,
            });
            chai.request(serverURL)
                .post('/')
                .send(order)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
            });
        });
    });

    describe('Adding different ticker should not result in an additional transaction', function() {
        it('should have no effect on the number of transactions', function(done) {
            const order = new Order({
                user_id: 'test-user',
                stock_symbol: 'NOT-TEST',
                order_type: 'sell',
                units: 30,
                price: 900,
            });
            chai.request(serverURL)
                .post('/')
                .send(order)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
            });
        });
    });

    // Existing transactions: 50 @ $1000, 10 @ $950 
    describe('GET transactions', function() {
        it('expecting 2 transactions', function(done) {
            chai.request(serverURL)
                .get('/transactions/JSON/')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    res.body.length.should.be.eql(2);
                    // Transactions sorted by new, so we can always access newest
                    // entry using an index of 0
                    res.body[0].price.should.be.eql(950);
                    res.body[0].units.should.be.eql(10);
                done();
            });
        });
    });

    // Existing orders: Sell 20 @ $900 
    // New Order: Sell 30 at $800
    describe('Selling more shares so that a large buy order can pair with multiple sell orders', 
        function() {
            it('should POST additional sell order', function(done) {
                const order = new Order({
                    user_id: 'test-user',
                    stock_symbol: 'TEST',
                    order_type: 'sell',
                    units: 30,
                    price: 800,
                });
                chai.request(serverURL)
                    .post('/')
                    .send(order)
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                });
        });
    });

    // Existing orders: Sell 20 @ $900, sell 30 @ $800
    // New Order: Sell 50 at $800
    describe('Add another sell order at the same price as existing', function() {
        it('should check that older sell order at same price gets paired first', function(done) {
            const order = new Order({
                user_id: 'test-user',
                stock_symbol: 'TEST',
                order_type: 'sell',
                units: 50,
                price: 800,
            });
            chai.request(serverURL)
                .post('/')
                .send(order)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
            });
        });
    });

    // Existing orders: Sell 20 @ $900, sell 30 @ $800, sell 50 at $800
    // New Order: Buy 100 at $1001.55
    describe('Pairing buy order when it will span multiple existing sell orders', function() {
        it('sell order should be filled in the sequence of 30, 50, 10 units based on price-time priorty', 
            function(done) {
                const order = new Order({
                    user_id: 'test-user',
                    stock_symbol: 'TEST',
                    order_type: 'buy',
                    units: 101,
                    price: 1001.55,
                });
                chai.request(serverURL)
                    .post('/')
                    .send(order)
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        done();
                });
        });
    });

    // Existing transactions: 40 @ $1000, 10 @ $950, 30 @ $900.77, 50 @ $900.77, 20 @ 950.77  
    describe('GET transactions', function() {
        it('should return 5 transactions', function(done) {
            chai.request(serverURL)
                .get('/transactions/JSON/')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    res.body.length.should.be.eql(5);
                    // Transactions sorted by new, so we can always access newest
                    // entry using an index of 0
                    res.body[0].price.should.be.eql(950.77);
                    res.body[0].units.should.be.eql(20);
                    res.body[1].price.should.be.eql(900.77);
                    res.body[1].units.should.be.eql(50);
                    res.body[2].price.should.be.eql(900.77);
                    res.body[2].units.should.be.eql(30);
                    // Use this for the next test
                    order_id = res.body[0].buy_order_id;
                done();
            });
        });
    });

    describe('DELETE order', function() {
        it('should not delete order since it is partially filled', function(done) {
            chai.request(serverURL)
                .delete('/' + order_id)
                .end((err, res) => {
                    res.should.have.status(405);
                    done();
            });
        });
    });

    describe('Add another sell order at the same price as existing', function() {
        it('should check that older sell order at same price gets paired first', function(done) {
            const order = new Order({
                user_id: 'test-user',
                stock_symbol: 'DELETE-TEST',
                order_type: 'sell',
                units: 50,
                price: 800,
            });
            chai.request(serverURL)
                .post('/')
                .send(order)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    done();
            });
        });
    });

    describe('GET order', function() {
        it('should GET all orders before one uses DELETE', function(done) {
          chai.request(serverURL)
              .get('/orders/JSON/')
              .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    res.body.length.should.be.eql(8);
                    // Use this for the next test
                    order_id = res.body[7]._id;
                    done();
              });
        });
    });

    describe('DELETE order', function() {
        it('should delete order', function(done) {
            chai.request(serverURL)
                .delete('/' + order_id)
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
            });
        });
    });

    describe('GET order', function() {
        it('should GET all orders after one uses DELETE', function(done) {
          chai.request(serverURL)
              .get('/orders/JSON/')
              .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    res.body.length.should.be.eql(7);
                    done();
              });
        });
    });

});
