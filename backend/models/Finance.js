const mongoose = require("mongoose");

const financeSchema = new mongoose.Schema({

    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
        required: true
    },

    transactionNumber: {
        type: String,
        unique: true,
        required: true
    },

    type: {
        type: String,
        enum: [
            "contribution",
            "claim",
            "expense",
            "income",
            "refund",
            "withdrawal",
            "adjustment"
        ],
        required: true
    },

    category: {
        type: String,
        default: ""
    },

    amount: {
        type: Number,
        required: true,
        min: 0
    },

    description: {
        type: String,
        default: ""
    },

    paymentMethod: {
        type: String,
        enum: [
            "Cash",
            "M-PESA",
            "Bank",
            "Cheque"
        ],
        default: "M-PESA"
    },

    referenceNumber: {
        type: String,
        default: ""
    },

    receiptNumber: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: [
            "pending",
            "approved",
            "rejected",
            "completed"
        ],
        default: "pending"
    },

    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null
    },

    approvedAt: {
        type: Date
    },

    transactionDate: {
        type: Date,
        default: Date.now
    },

    notes: {
        type: String,
        default: ""
    }

},
{
    timestamps: true
});

financeSchema.index({ member: 1 });
financeSchema.index({ type: 1 });
financeSchema.index({ status: 1 });
financeSchema.index({ transactionDate: -1 });

module.exports = mongoose.model(
    "Finance",
    financeSchema
);