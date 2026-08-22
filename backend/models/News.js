const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
{
    title:{
        type:String,
        required:true,
        trim:true
    },

    slug:{
        type:String,
        unique:true,
        lowercase:true,
        trim:true
    },

    summary:{
        type:String,
        default:"",
        maxlength:500
    },

    content:{
        type:String,
        required:true
    },

    category:{
        type:String,
        enum:[
            "General",
            "Announcement",
            "Finance",
            "Contribution",
            "Meeting",
            "Event",
            "Emergency",
            "Election",
            "Poll"
        ],
        default:"General"
    },

    coverImage:{
        type:String,
        default:""
    },

    images:[
        {
            type:String
        }
    ],

    attachments:[
        {
            fileName:String,
            fileUrl:String,
            fileType:String,
            name:String,
            url:String,
            type:String
        }
    ],

    feedbackReportId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"FeedbackCollection",
        default:null
    },

    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Admin",
        required:true
    },

    poll:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Poll",
        default:null
    },

    likes:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Member"
        }
    ],

    commentsCount:{
        type:Number,
        default:0
    },

    views:{
        type:Number,
        default:0
    },

    shares:{
        type:Number,
        default:0
    },

    featured:{
        type:Boolean,
        default:false
    },

    pinned:{
        type:Boolean,
        default:false
    },

    allowComments:{
        type:Boolean,
        default:true
    },

    published:{
        type:Boolean,
        default:true
    },

    publishDate:{
        type:Date,
        default:Date.now
    },

    expiryDate:{
        type:Date
    },

    tags:[
        {
            type:String,
            trim:true
        }
    ],

    status:{
        type:String,
        enum:[
            "draft",
            "published",
            "archived"
        ],
        default:"published"
    }

},
{
    timestamps:true
});

newsSchema.index({title:"text",content:"text"});
newsSchema.index({category:1});
newsSchema.index({status:1});
newsSchema.index({publishDate:-1});
newsSchema.index({featured:1});
newsSchema.index({pinned:1});

module.exports =
    mongoose.models.News ||
    mongoose.model("News", newsSchema);