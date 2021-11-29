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
    if (!Array.isArray(transactionArr) || !transactionArr.length) {
        return;
    } else {
        try {
            // insertMany doesn't write to db sequentally which breaks testing
            // since exact sequence is important for Price-Time Priority testing
            for(let i in transactionArr) {
                const transaction = new Transaction(transactionArr[i])
                await transaction.save();
            };
        } catch (err) {
            console.log(err);
        };  
    };
    return;
};

const updateFilledOrderArr = async (filledOrderArr) => {
    if (!Array.isArray(filledOrderArr) || !filledOrderArr.length) {
        return;
    } else {
        try {
            for (let i in filledOrderArr) {
                await Order.updateOne(
                    { _id: filledOrderArr[i] }, 
                    { $set: { 
                        is_filled: true, 
                        units: 0 }
                    },
                );
            };
        } catch (err) {
            console.log(err);
        };  
    };
    return;
};

const queryAndMatchPairs = async (req, res, isNewOrder) => {
    let transactionArr = []; 
    let filledOrderArr = [];
    let topPairResult; 

    if (
        (isNewOrder && req.body.units <= 0) || 
        req.body.price <= 0 || 
        req.body.stock_symbol === '' ||
        req.body.user_id === '' ||
        !req.body.units ||
        !req.body.price ||
        !req.body.stock_symbol ||
        !req.body.user_id
    ) {
        return res.status(400).json({ message: 'Invalid order input' });
    };

    let order;
    isNewOrder ? 
        order = new Order({
            user_id: req.body.user_id,
            stock_symbol: req.body.stock_symbol,
            order_type: req.body.order_type,
            original_units: req.body.units,
            units: req.body.units,
            price: req.body.price,
            order_time: req.body.order_time,
            is_filled: false,
            is_partially_filled: false
        })
        : 
        order = req.body;

    const searchForPair = async () => {
        const order_type = order.order_type === 'buy' ?
            'sell' : 'buy';
        const price = order.order_type === 'buy' ?
            1 : -1;

        const filter = order.order_type === 'buy' ?
            { 
                stock_symbol: order.stock_symbol, 
                order_type,
                price: { $lte: order.price },
                units: { $gt: 0 },
                is_filled: false,
            }
            :
            { 
                stock_symbol: order.stock_symbol, 
                order_type,
                price: { $gte: order.price },
                units: { $gt: 0 },
                is_filled: false,
            }

        const update = {
            $inc: { units: -order.units },
            $set: { is_partially_filled: true}
        };
        const options = {
            sort: {
                price,
                order_time: 1
            },
            new: true
        };
        try {
            return await Order.findOneAndUpdate(filter, update, options);
        } catch (err) {
            return null;
        }
    }

    let remaining_units = order.units;
    while (remaining_units > 0) {
        topPairResult = await searchForPair();

        // No matching trading pair is found
        if (!topPairResult) {
            try {
                // Since this could be after some pairing iterations 
                order.units = remaining_units;
                if (remaining_units > 0 && order.units !== remaining_units) {
                    order.is_partially_filled = true;
                };

                isNewOrder && await order.save();
                !isNewOrder && await Order.updateOne( 
                    {_id: order._id }, 
                    { 
                        price: order.price, 
                        units: order.units, 
                        original_units: order.original_units,
                        is_partially_filled: order.is_partially_filled 
                    }
                );
            } catch (err) {
                return res.status(400).json({ message: err.message });
            };  
            break;
        // A matching trading pair is found
        } else {
            const buy_order_id = order.order_type === 'buy' ? 
                order._id : topPairResult._id;
            const sell_order_id = order.order_type === 'sell' ? 
                order._id : topPairResult._id;

            // If one existing order can fill the entire new order
            if (topPairResult.units >= 0) { 
                transactionArr.push({
                    stock_symbol: order.stock_symbol,
                    units: remaining_units,
                    price: Math.abs(
                        (order.price + topPairResult.price)/2
                        ).toFixed(2),
                    buy_order_id: buy_order_id.toString(),
                    sell_order_id: sell_order_id.toString()
                });

                remaining_units = 0;
                order.units = 0;
                order.is_partially_filled = true;
                order.is_filled = true;

                isNewOrder && await order.save();
                !isNewOrder && await Order.updateOne( 
                    {_id: order._id }, 
                    { 
                        price: order.price, 
                        units: order.units, 
                        original_units: order.original_units,
                        is_partially_filled: order.is_partially_filled,
                        is_filled: order.is_filled 
                    }
                );

                topPairResult.units === 0 && filledOrderArr.push(topPairResult._id.toString());

            // It will take multiple orders
            } else {
                transactionArr.push({
                    stock_symbol: order.stock_symbol,
                    units: order.units - Math.abs(topPairResult.units),
                    price: Math.abs(
                        (order.price + topPairResult.price)/2
                        ).toFixed(2),
                    buy_order_id: buy_order_id.toString(),
                    sell_order_id: sell_order_id.toString()
                });

                remaining_units = Math.abs(topPairResult.units);
                order.units = remaining_units;
                order.is_partially_filled = true;
                order.is_filled = false;
                
                isNewOrder && await order.save();
                !isNewOrder && await Order.updateOne( 
                    {_id: order._id }, 
                    { 
                        price: order.price, 
                        units: order.units, 
                        original_units: order.original_units,
                        is_partially_filled: order.is_partially_filled,
                        is_filled: order.is_filled 
                    }
                );

                filledOrderArr.push(topPairResult._id.toString());
            };
        };
    };

    // SAVE THE TRANSACTIONS TO DB AT THE END TO NOT DELAY ORDER MATCHING
    await saveTransactionArr(transactionArr);
    
    // UPDATE THE NEGATIVE UNITS TO ZERO IN DB AT THE END TO NOT DELAY ORDER MATCHING
    await updateFilledOrderArr(filledOrderArr);
}

// GET all orders
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ "order_time": -1 });
        res.status(200).render('orders', {
            orders
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all orders in JSON format
router.get('/orders/JSON', async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ "order_time": 1 });
        res.status(200).json(orders)
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all transactions
router.get('/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .sort({ "transaction_time": -1 });
        res.status(200).render('transactions', {
            transactions
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET all transactions in JSON format
router.get('/transactions/JSON', async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .sort({ "transaction_time": -1 });
        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET one by id
router.get('/orders/:id', getOrder, (req, res) => {
    res.status(200).json(res.order);
});

// GET index page
router.get('/', async (req, res) => {
    res.render('index');
});

// CREATE one order
router.post('/', async (req, res) => {
    await queryAndMatchPairs(req, res, true);

    res.status(200).redirect('/orders');
});

// PATCH one order (only units and/or price allowed to be updated)
router.patch('/:id', async (req, res) => {

    if (!req.body.price && req.body.units && Object.keys(req.body).length > 1) {
        return res.status(405).json({ 
            message: "PATCH request contains invalid fields" }) 
    } else if (!req.body.units && req.body.price && Object.keys(req.body).length > 1) {
        return res.status(405).json({ 
            message: "PATCH request contains invalid fields" })
    } else if (req.body.units && req.body.price && Object.keys(req.body).length > 2) {
        return res.status(405).json({ 
            message: "PATCH request contains invalid fields" })  
    } else if (!req.body.price && !req.body.units) {
        return res.status(405).json({ 
            message: "PATCH must include updated units or price" })
    };

    // If price is null just update units without any matching needed
    if (!req.body.price) {
        try {
            const filter = { 
                _id: req.params.id,
                is_filled: false,
                is_partially_filled: false
            };
            const update = { $set: 
                { units: req.body.units, original_units: req.body.units }
            };
            const updatedOrder = await Order.findOneAndUpdate(filter, update);
            if (updatedOrder) {
                res.status(200).redirect('/orders');
            } else {
                res.status(405).json({ 
                    message: "Order is filled or partially filled and cannot be modified" })
            };
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    // Price is being updated so try to match after updating
    } else {
        try {
            const filter = { 
                _id: req.params.id,
                is_filled: false,
                is_partially_filled: false
            };
            // Temporarily set units to 0 in db so a new order can't 'steal' it 
            // while pairing is in progress
            const update = { $set: { units: 0 }};
            const updatedOrder = await Order.findOneAndUpdate(filter, update);
            if (updatedOrder) {
                req.body._id = updatedOrder._id;
                req.body.user_id = updatedOrder.user_id;
                req.body.stock_symbol = updatedOrder.stock_symbol;
                req.body.order_type = updatedOrder.order_type;
                if(!req.body.units) req.body.units = updatedOrder.units;
                if(!req.body.units) req.body.original_units = updatedOrder.original_units;
                if(req.body.units) req.body.original_units = req.body.units;
                req.body.order_time = updatedOrder.order_time;
                req.body.is_filled = updatedOrder.is_filled;
                req.body.is_partially_filled = updatedOrder.is_partially_filled;

                await queryAndMatchPairs(req, res, false);
                res.status(200).redirect('/orders');
            } else {
                res.status(405).json({ 
                    message: "Order is filled or partially filled and cannot be modified" })
            }
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
});

// DELETE one
router.delete('/:id', getOrder, async (req, res) => {
    // res.order is set by the middlewarte function getOrder
    if(!res.order.is_filled && !res.order.is_partially_filled) {
        try {
            await res.order.remove();
            res.status(200).json({ 
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
