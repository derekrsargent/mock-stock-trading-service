const express = require('express');
const Order = require('../models/order');

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

const updateOrder = async (id, units) => {
    try {
        await Order.updateOne( {"_id": id}, {$set: {"units": units}} );
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
};

const matchOrder = async (order_type, units, stock_symbol, price) => {
    const new_order_type = order_type;
    let test;
    try {
        new_order_type === "buy" ?
            test = await Order.find({
                $and: [
                    { stock_symbol }, 
                    { order_type: "sell" },
                    { price: { $lte: price }}
                ]
            }).sort({"order_time":-1})
            :
            test = await Order.find({
                $and: [
                    { stock_symbol }, 
                    { order_type: "buy" },
                    { price: { $gte: price }}
                ]
            }).sort({ "order_time": 1 })
        return test;
    } catch (err) {
        return err;
    }
};

const saveTransaction = async () => {
    console.log('saving transaction');
}

// GET (test)
router.get('/test/', async (req, res) => {
    try {
        const result = await updateOrder("619796176fe4da1209b1207c", 69);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
    // const result = await matchOrder("buy", 20, "TSLA", 2000);
    // console.log(result);
    // if(result.message != null) {
    //     console.log('no errors')
    //     res.json(result);
    // } else {
    //     console.log('errors')
    //     res.status(500).json({ message: err.message });
    // };
    // const new_order_type = order_type;
    // const s = 0;
    // let test;
    // try {
    //     new_order_type === "buy" ?
    //         test = await Order.find({
    //             $and: [
    //                 { stock_symbol }, 
    //                 { order_type: "sell" },
    //                 { price: { $lte: price }}
    //             ]
    //         }).sort({"order_time":-1})
    //         :
    //         test = await Order.find({
    //             $and: [
    //                 { stock_symbol }, 
    //                 { order_type: "buy" },
    //                 { price: { $gte: price }}
    //             ]
    //         }).sort({ "order_time": 1 })
    //     return test;
    // } catch (err) {
    //     return err;
    // }
});

// GET all orders
router.get('/orders/', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all transactions
router.get('/transactions/', async (req, res) => {
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

// GET all by stock_ticker
router.get('/:stock_ticker', getOrder, (req, res) => {
    //res.send(req.params.id);
    res.send(res.order);
})

// CREATE one order
router.post('/', async (req, res) => {
    // Time of order request stored here
    const order = new Order({
        id: req.body.id,
        user_id: req.body.user_id,
        stock_symbol: req.body.stock_symbol,
        order_type: req.body.order_type,
        units: req.body.units,
        price: req.body.price,
        order_time: req.body.order_time,
    });

    // Search for trading pairs with new order first
    let matchResults;
    try {
        order.order_type === "buy" ?
            matchResults = await Order.find({
                $and: [
                    { stock_symbol: order.stock_symbol }, 
                    { order_type: "sell" },
                    { price: { $lte: order.price }}
                ]
            }).sort({ "order_time": 1 })
            :
            matchResults = await Order.find({
                $and: [
                    { stock_symbol: order.stock_symbol }, 
                    { order_type: "buy" },
                    { price: { $gte: order.price }}
                ]
            }).sort({ "order_time": 1 })
    } catch (err) {
        res.status(500).json({ message: err.message })
    };

    // If the new order does not pair up partially/fully with any existing order
    // then create a new order
    if (!Array.isArray(matchResults) || !matchResults.length) {
        console.log('no results, so creating a new order')
        try {
            const newOrder = await order.save()
            res.status(201).json(newOrder)
        } catch (err) {
            res.status(400).json({ message: err.message })
        };   
    // Else there is an existing order(s) that can partially/fully fill the new order
    } else {
        let remaining_units = order.units;

        for(let i in matchResults) {
            console.log('remaining units: ', remaining_units);
            console.log(matchResults[i]._id.toString());
            if(remaining_units <= 0) {
                break;
            };

            if(matchedResults[i].units > remaining_units) {
                // MODIFY EXISTING ORDER TO REDUCE IT
                try {
                    const result = await updateOrder(
                        matchResults[i]._id.toString(),
                        matchResults[i].units - remaining_units
                    );
                    if (result == true) {
                        // IF SUCCESS, COMPLETE TRANSACTION
                        // IF SUCCESS, BREAK LOOP
                        remaining_units = 0;
                        break;
                    }
                } catch (err) {
                    console.error(err);
                }
            }
            else if(matchedResults[i].units == remaining_units) {
                // DELETE EXISTING ORDER
                try {
                    const result = await deleteOrder(
                        matchResults[i]._id.toString()
                    );
                    if(result) {
                        // IF SUCCESS, COMPLETE TRANSACTION
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
                    const result = await deleteOrder(
                        matchResults[i]._id.toString()
                    );
                    if(result) {
                        // IF SUCCESS, COMPLETE TRANSACTION
                        // IF SUCCESS, DECREMENT remaining_units
                        remaining_units -= matchResults[i].units;
                        break;
                    }
                } catch (err) {
                    console.log(err);
                };
                // COMPLETE TRANSACTION
            }
        };
        console.log(matchResults);
        console.log('results');
        res.send('done');
    }
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
