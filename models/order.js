const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    stock_symbol: {
        type: String,
        required: true
    },
    order_type: {
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
    order_time: {
        type: Date,
        default: Date.now,
        required: true
    },
    is_filled: {
        type: Boolean,
        default: false,
        required: true
    },
    is_partially_filled: {
        type: Boolean,
        default: false,
        required: true
    }
});

module.exports = mongoose.model('Order', orderSchema)
