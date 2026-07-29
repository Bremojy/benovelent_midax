const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
{
    text:{
        type:String,
        required:true,
        trim:true
    },

    votes:{
        type:Number,
        default:0
    }
},
{
    _id:true
});

const pollSchema = new mongoose.Schema(
{

    title:{
        type:String,
        required:true,
        trim:true
    },

    description:{
        type:String,
        default:""
    },

    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin",
        required:true
    },

    news:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"News",
        default:null
    },

    options:[optionSchema],

    pollType:{
        type:String,
        enum:["single","multiple"],
        default:"single"
    },

    anonymous:{
        type:Boolean,
        default:false
    },

    showResults:{
        type:Boolean,
        default:true
    },

    active:{
        type:Boolean,
        default:true
    },

    totalVotes:{
        type:Number,
        default:0
    },

    startDate:{
        type:Date,
        default:Date.now
    },

    endDate:{
        type:Date,
        required:true
    }

},
{
    timestamps:true
});

pollSchema.index({active:1});
pollSchema.index({endDate:1});
pollSchema.index({createdAt:-1});

module.exports = mongoose.model(
    "Poll",
    pollSchema
);