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

describe('Orders', () => {
    beforeEach((done) => {
        Order.deleteMany({}, (err) => {
           done();
        });
    });

    describe('GET order', function() {
        it('it should GET all orders', function(done) {
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

    describe('POST incorrect order', () => {
        it('it should not POST an order with incorrect fields', (done) => {
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

        describe('POST incorrect order', () => {
            it('it should not POST an order with a missing required price field', (done) => {
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

        describe('POST correct order', () => {
            it('it should POST an order with all fields as required', (done) => {
                const order = new Order({
                    user_id: 'test-user',
                    stock_symbol: 'TEST',
                    order_type: 'buy',
                    units: 50,
                    price: 1000,
                    is_filled: false,
                    is_partially_filled: false,
                    order_time: Date.now()
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
            it('it should GET all orders', function(done) {
              chai.request(serverURL)
                  .get('/orders/JSON/')
                  .end((err, res) => {
                        console.log(res.body);
                        res.should.have.status(200);
                        res.body.should.be.a('array');
                    done();
                  });
            });
        });
    });
});

describe('Transactions', () => {
    beforeEach((done) => {
        Transaction.deleteMany({}, (err) => {
           done();
        });
    });

    describe('GET transaction', function() {
        it('it should GET all transactions', function(done) {
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
});

