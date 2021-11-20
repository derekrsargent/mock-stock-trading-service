process.env.NODE_ENV = 'test';

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
                const order = {
                    user_id: 'test-user',
                    stock_symbol: 'TEST',
                    order_type: 'buy',
                    units: 50,
                    price: 1000,
                };
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
    });
});

describe('Transactions', () => {
    beforeEach((done) => {
        Transaction.remove({}, (err) => {
           done();
        });
    });
});

// describe('Check database related operations', () => {

//     // before(function(done) {
//     //     mongoose.connect('mongodb://localhost/test');
//     //     const db = mongoose.connection;
//     //     db.on('error', console.error.bind(console, 'Connection error'));
//     //     db.once('open', function() {
//     //       console.log('We are connected to test database!');
//     //       done();
//     //     });
//     //   });

//     beforeEach(function() {
//         return Order.deleteMany({})
//     });

//     describe('Creating a correct order in database', function() {
//         it('Creates a New Order', function(done) {
//             const newOrder = new Order({ 
//                 user_id: "test_user",
//                 stock_symbol: 'TEST',
//                 order_type: 'buy',
//                 units: 100,
//                 price: 55,
//                 order_time: Date.now(),
//              });
//             newOrder.save() 
//                 .then(() => {
//                     assert(!newOrder.isNew);
//                     done();
//                 });
//         });
//     });

//     describe('Catching an incorrect order in database', function() {
//         it('Fails an an incorrect Order', function(done) {
//             const newIncorrectOrder = new Order({ 
//                 wrong_field: "wrong field"
//              });
//             newIncorrectOrder.save() 
//                 .catch(() => {
//                     assert(true);
//                     done(); 
//                 });
//         });
//     });

//     describe('Creating a correct transaction in database', function() {
//         it('Creates a New Transaction', function(done) {
//             const newTransaction = new Transaction({ 
//                 stock_symbol: 'TEST',
//                 units: 100,
//                 price: 46.50,
//                 buy_order_id: "619924a6f0fac176455a8d24",
//                 sell_order_id: "619924a6f0fac176455a8d23",
//                 order_time: Date.now()
//              });
//             newTransaction.save() 
//                 .then(() => {
//                     assert(!newTransaction.isNew);
//                     done();
//                 });
//         });
//     });

//     describe('Catching an incorrect Transaction in database', function() {
//         it('Fails an an incorrect Transaction', function(done) {
//             const newIncorrectTransaction = new Transaction({ 
//                 wrong_field: "wrong field"
//              });
//             newIncorrectTransaction.save() 
//                 .catch(() => {
//                     assert(true);
//                     done(); 
//                 });
//         });
//     });

//     // after(function(done){
//     //     mongoose.connection.db.dropDatabase(function(){
//     //       mongoose.connection.close(done);
//     //     });
//     //   });
// });

