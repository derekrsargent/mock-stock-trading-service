const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    stock_symbol: {
        type: String,
        required: true
    },
    buy_order_id: {
        type: String,
        required: true
    },
    sell_order_id: {
        type: String,
        required: true
    },
    units: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    transaction_time: {
        type: Date,
        default: Date.now,
        required: true
    }
});

module.exports = mongoose.model('Transaction', transactionSchema)