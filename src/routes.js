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

const matchOrder = async (order_type, units, stock_symbol, price) => {

};

const saveTransaction = async () => {
    console.log('saving transaction');
}

// GET (test)
router.get('/test/', async (req, res) => {
    const new_order_type = "sell";
    let test;
    try {
        new_order_type === "buy" ?
            test = await Order.find({
                $and: [
                    { stock_symbol: "TSLA" }, 
                    { order_type: "sell" },
                    { price: { $lte: 1900 }}
                ]
            }).sort({"order_time":-1})
            :
            test = await Order.find({
                $and: [
                    { stock_symbol: "TSLA" }, 
                    { order_type: "buy" },
                    { price: { $gte: 1000 }}
                ]
            }).sort({ "units": -1 })
        res.json(test);
    } catch {
        res.status(500).json({ message: err.message });
    }
});

// GET all orders
router.get('/orders/', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch {
        res.status(500).json({ message: err.message });
    }
});

// GET all transactions
router.get('/transactions/', async (req, res) => {
    try {
        const transactions = await Transaction.find();
        res.json(transactions);
    } catch {
        res.status(500).json({ message: err.message });
    }
    //res.send('GET ALL');
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
    // Time of order is stored pre-emptively here
    const order = new Order({
        id: req.body.id,
        user_id: req.body.user_id,
        stock_symbol: req.body.stock_symbol,
        order_type: req.body.order_type,
        units: req.body.units,
        price: req.body.price,
        order_time: req.body.order_time,
    });

    // Try to match order first
    const results = 
        matchOrder(order.order_type, order.units, order.stock_symbol, order.price);
    console.log(results);

    try {
        const newOrder = await order.save()
        // 201 is successful creation
        res.status(201).json(newOrder)
    } catch (err) {
        res.status(400).json({ message: err.message })
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
