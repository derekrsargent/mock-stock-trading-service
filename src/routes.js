const express = require('express');
const Order = require('../models/order');
const Transaction = require('../models/transaction');

const router = express.Router();

const getOrder = async (req, res, next) => {
    let order; 
    try {
        order = await Order.findById(req.params.id);
        if (order == null) {
            return res.status(404).json({ 
                message: 'Order does not exit' })
        };
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
    res.order = order;
    next();
};

const saveTransactionArr = async (transactionArr) => {
    console.log('saving transaction array');
    if (!Array.isArray(transactionArr) || !transactionArr.length) {
        return;
    } else {
        try {
            await Transaction.insertMany(transactionArr);
        } catch (err) {
            console.log(err);
        };  
    };
    return;
};

// GET all orders
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ "order_time": -1 });
        res.render('orders', {
            orders
        });
        console.log(getOrders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all orders in JSON format
router.get('/orders/JSON/', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders)
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all transactions
router.get('/transactions/', async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .sort({ "transaction_time": -1 });;
        res.render('transactions', {
            transactions
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all transactions in JSON format
router.get('/transactions/JSON/', async (req, res) => {
    try {
        const transactions = await Transaction.find();
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET one by id
router.get('/orders/:id', getOrder, (req, res) => {
    res.send(res.order);
});

// GET index page
router.get('/', async (req, res) => {
    res.render('index');
});

// CREATE one order
router.post('/', async (req, res) => {
    let transactionArr = []; 
    let matchResults;
    const order = new Order({
        id: req.body.id,
        user_id: req.body.user_id,
        stock_symbol: req.body.stock_symbol,
        order_type: req.body.order_type,
        units: req.body.units,
        price: req.body.price,
        order_time: req.body.order_time,
    });

    try {
        order.order_type === "buy" ?
            matchResults = await Order.find({
                $and: [
                    { stock_symbol: order.stock_symbol }, 
                    { order_type: "sell" },
                    { price: { $lte: order.price }},
                    { is_filled: false },
                ]
            }).sort({ "price": 1, "order_time": 1 })
            :
            matchResults = await Order.find({
                $and: [
                    { stock_symbol: order.stock_symbol }, 
                    { order_type: "buy" },
                    { price: { $gte: order.price }},
                    { is_filled: false },
                ]
            }).sort({ "price": -1, "order_time": 1 })
    } catch (err) {
        console.log(err);
    };

    // If the new order does not pair up partially/fully with any existing order
    // then create a new order
    if (!Array.isArray(matchResults) || !matchResults.length) {
        try {
            const newOrder = await order.save()
        } catch (err) {
            console.log(err);
        };   
    // Else there is an existing order(s) that can partially/fully fill the new order
    } else {
        let remaining_units = order.units;

        for(let i in matchResults) {
            const buy_order_id = order.order_type === "buy" ? 
                order._id : matchResults[i]._id;
            const sell_order_id = order.order_type === "sell" ? 
                order._id : matchResults[i]._id;

            if(remaining_units <= 0) {
                break;
            };

            if(matchResults[i].units > remaining_units) {
                // MODIFY EXISTING ORDER TO REDUCE IT
                try {
                    const result = 
                        await Order.updateOne( {"_id": matchResults[i]._id.toString()}, {
                            $set: {
                                "units": matchResults[i].units - remaining_units,
                                "is_partially_filled": true
                            }
                    });
                    if(result) {
                        // IF SUCCESS, POPULATE TRANSACTION
                        transactionArr.push({
                            stock_symbol: order.stock_symbol,
                            units: remaining_units,
                            price: Math.abs(
                                (order.price + matchResults[i].price)/2
                                ).toFixed(2),
                            buy_order_id: buy_order_id.toString(),
                            sell_order_id: sell_order_id.toString()
                        });
                        // IF SUCCESS, SAVE THE NEW ORDER AND AS FILLED
                        const newOrder = new Order({
                            //id: req.body.id,
                            user_id: req.body.user_id,
                            stock_symbol: req.body.stock_symbol,
                            order_type: req.body.order_type,
                            units: req.body.units,
                            price: req.body.price,
                            order_time: req.body.order_time,
                            is_filled: true
                        });
                        await newOrder.save()
                        // IF SUCCESS, BREAK LOOP
                        remaining_units = 0;
                        break;
                    }
                } catch (err) {
                    console.error(err);
                }
            }
            else if(matchResults[i].units == remaining_units) {
                // UPDATE EXISTING ORDER TO BE FILLED
                try {
                    const result = 
                        await Order.updateOne( {"_id": matchResults[i]._id.toString()}, {
                            $set: {
                                "is_filled": true
                            }
                        });
                    if(result) {
                        // IF SUCCESS, POPULATE TRANSACTION
                        transactionArr.push({
                            stock_symbol: order.stock_symbol,
                            units: remaining_units,
                            price: Math.abs(
                                (order.price + matchResults[i].price)/2
                                ).toFixed(2),
                            buy_order_id: buy_order_id.toString(),
                            sell_order_id: sell_order_id.toString()
                        });
                        // IF SUCCESS, SAVE THE NEW ORDER AND AS FILLED
                        const newOrder = new Order({
                            //id: req.body.id,
                            user_id: req.body.user_id,
                            stock_symbol: req.body.stock_symbol,
                            order_type: req.body.order_type,
                            units: req.body.units,
                            price: req.body.price,
                            order_time: req.body.order_time,
                            is_filled: true
                        });
                        await newOrder.save()
                        // IF SUCCESS, BREAK LOOP
                        remaining_units = 0;
                        break;
                    }
                } catch (err) {
                    console.log(err);
                };
            } else { // ELSE: ONLY A PARTIAL FILL AND NEED TO GO TO NEXT ORDER
                // DELETE EXISTING ORDER
                try {
                    const result = 
                        await Order.updateOne( {"_id": matchResults[i]._id.toString()}, {
                            $set: {
                                "is_filled": true
                            }
                    });
                    if(result) {
                        // IF SUCCESS, POPULATE TRANSACTION
                        transactionArr.push({
                            stock_symbol: order.stock_symbol,
                            units: matchResults[i].units,
                            price: Math.abs(
                                (order.price + matchResults[i].price)/2
                                ).toFixed(2),
                            buy_order_id: buy_order_id.toString(),
                            sell_order_id: sell_order_id.toString()
                        });
                        // IF SUCCESS, DECREMENT remaining_units
                        remaining_units -= matchResults[i].units;
                    }
                } catch (err) {
                    console.log(err);
                };
            }
        };

        // IF REMAINING UNITS NEEDED AFTER ALL MATCHED PAIRS ARE ITERATED THROUGH
        if (remaining_units > 0) {
            const newOrder = new Order({
                id: req.body.id,
                user_id: req.body.user_id,
                stock_symbol: req.body.stock_symbol,
                order_type: req.body.order_type,
                units: remaining_units,
                price: req.body.price,
                order_time: req.body.order_time,
                is_partially_filled: true
            });
            try {
                await newOrder.save()
            } catch (err) {
                console.log(err);
            };  
        };

        await saveTransactionArr(transactionArr);
    }
    res.redirect('/orders');
});

// UPDATE one (with middleware function)
// Can only update price and units for an existing order
router.patch('/:id', getOrder, async (req, res) => {
    // res.order is set by the middlewarte function getOrder
    if(!res.order.is_filled && !res.order.is_partially_filled) {
        if (req.body.units !== null) {
            res.order.units = req.body.units;
        }
        if (req.body.price !== null) {
            // TODO: Price change to trigger looking for a trading pair
            res.order.price = req.body.price;
        }
        try {
            const updatedOrder = await res.order.save();
            res.json(updatedOrder);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    } else if (res.order.filled) {
        res.status(405).json({ 
            message: "Order is filled and cannot be modified" })
    } else {
        res.status(405).json({ 
            message: "Order is partially filled and cannot be modified" })
    };
});

// DELETE one
router.delete('/:id', getOrder, async (req, res) => {
    // res.order is set by the middlewarte function getOrder
    if(!res.order.is_filled && !res.order.is_partially_filled) {
        try {
            await res.order.remove();
            res.json({ 
                message: "Order has been successfully cancelled" })
        } catch (err) {
            res.status(500).json({ message: err.message })
        }
    } else if (res.order.filled) {
        res.status(405).json({ 
            message: "Order is filled and cannot be cancelled" })
    } else {
        res.status(405).json({ 
            message: "Order is partially filled and cannot be cancelled" })
    };
});

module.exports = router;
