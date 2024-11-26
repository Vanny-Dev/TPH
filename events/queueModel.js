const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
    title: String,
    addedAt: { type: Date, default: Date.now }
});

const Queue = mongoose.model('Queue', queueSchema);

console.log(Queue);

module.exports = Queue;
