const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({

    poll: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Poll",
        required: true
    },

    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
        required: true
    },

    selectedOptions: [{
        type: mongoose.Schema.Types.ObjectId
    }],

    createdAt: {
        type: Date,
        default: Date.now
    }

},
{
    timestamps: true
});

// Prevent duplicate votes
voteSchema.index(
    {
        poll: 1,
        member: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model(
    "Vote",
    voteSchema
);