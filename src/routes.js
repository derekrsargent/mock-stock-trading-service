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

const deleteOrder = async (id) => {
    try {
        await Order.deleteOne( {"_id": id} );
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
};

const updateOrder = async (id, units, is_filled, is_partially_filled) => {
    try {
        await Order.updateOne( {"_id": id}, {
            $set: [
                {"units": units},
                {"is_filled": is_filled},
                {"is_partially_filled": is_partially_filled}
            ]
        });
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
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

// GET (test)
router.get('/test', async (req, res) => {
    //console.log(req);
    console.log('GET test');

    res.render('index');
    //res.send('test empty');
});

// POST (test)
router.post('/test', async (req, res) => {
    //console.log(req);
    const result = await Order.updateOne( {"_id": req.body._id}, {
        $set: {
            "units": 29,
            "is_partially_filled": false
        }
    });
    console.log('POST test');
    res.json(result);
    //res.send(req.body);
    //res.send('test empty');
});

// GET all orders
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ "order_time": -1 });
        res.render('orders', {
            orders
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all orders in JSON
router.get('/orders/JSON/', async (req, res) => {
    try {
        const orders = await Order.find({ "is_filled": false });
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

// GET all transactions in JSON
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
        res.status(500).json({ message: err.message })
    };

    console.log('after matching');
    console.log(matchResults);

    // If the new order does not pair up partially/fully with any existing order
    // then create a new order
    if (!Array.isArray(matchResults) || !matchResults.length) {
        console.log('no results, so creating a new order')
        try {
            const newOrder = await order.save()
            //res.status(201).json(newOrder)
        } catch (err) {
            res.status(400).json({ message: err.message })
        };   
    // Else there is an existing order(s) that can partially/fully fill the new order
    } else {
        let remaining_units = order.units;

        for(let i in matchResults) {
            const buy_order_id = order.order_type === "buy" ? 
                order._id : matchResults[i]._id;
            const sell_order_id = order.order_type === "sell" ? 
                order._id : matchResults[i]._id;

            // console.log('remaining units: ', remaining_units);
            // console.log(matchResults[i]._id.toString());
            if(remaining_units <= 0) {
                break;
            };

            if(matchResults[i].units > remaining_units) {
                // MODIFY EXISTING ORDER TO REDUCE IT
                try {
                    // const result = await updateOrder(
                    //     matchResults[i]._id.toString(),
                    //     matchResults[i].units - remaining_units,
                    //     false,
                    //     true,
                    // );
                    const result = 
                    await Order.updateOne( {"_id": matchResults[i]._id.toString()}, {
                        $set: {
                            "units": matchResults[i].units - remaining_units,
                            "is_partially_filled": true
                        }
                    });
                    console.log(result);
                    
                    // POPULATE TRANSACTION
                    transactionArr.push({
                        stock_symbol: order.stock_symbol,
                        units: remaining_units,
                        price: Math.abs(
                            (order.price + matchResults[i].price)/2
                            ).toFixed(2),
                        buy_order_id: buy_order_id.toString(),
                        sell_order_id: sell_order_id.toString()
                    });
                    // SAVE THE NEW ORDER AND AS FILLED
                    const newOrder = new Order({
                        id: req.body.id,
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
                } catch (err) {
                    console.error(err);
                }
            }
            else if(matchResults[i].units == remaining_units) {
                // DELETE EXISTING ORDER
                try {
                    // const result = await deleteOrder(
                    //     matchResults[i]._id.toString()
                    // );
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
                        const order = new Order({
                            id: req.body.id,
                            user_id: req.body.user_id,
                            stock_symbol: req.body.stock_symbol,
                            order_type: req.body.order_type,
                            units: req.body.units,
                            price: req.body.price,
                            order_time: req.body.order_time,
                            is_filled: true
                        });
                        await order.save()
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
                    // const result = await deleteOrder(
                    //     matchResults[i]._id.toString()
                    // );
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

        if (remaining_units > 0) {
            console.log('left over as a new order')
            const order = new Order({
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
                const newOrder = await order.save()
                //res.status(201).json(newOrder)
            } catch (err) {
                //res.status(400).json({ message: err.message })
            };  
        };

        console.log('results');
        //console.log(matchResults);
        console.log(transactionArr)
        await saveTransactionArr(transactionArr);
        //res.send('done');
        //res.render('orders');
    }
    res.redirect('/orders');
});

// UPDATE one (with middleware function)
// Can only update price and units for an existing order
router.patch('/:id', getOrder, async (req, res) => {
    if (req.body.units !== null) {
        res.order.units = req.body.units;
    }
    if (req.body.price !== null) {
        res.order.price = req.body.price;
    }
    try {
        const updatedOrder = await res.order.save();
        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE one
router.delete('/:id', getOrder, async (req, res) => {
    try {
        await res.order.remove();
        res.json({ 
            message: "Order has been successfully cancelled" })
    } catch (err) {
        res.status(500).json({ message: "err up in herrrr" })
    }
})

module.exports = router;
