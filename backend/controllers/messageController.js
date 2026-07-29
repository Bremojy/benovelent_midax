const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

/* =====================================================
SEND MESSAGE
===================================================== */

exports.sendMessage = async (req,res)=>{

try{

const {

conversationId,

message,

messageType,

attachment,

replyTo

}=req.body;

const conversation=
await Conversation.findById(conversationId);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

const newMessage=
await Message.create({

conversation:conversationId,

sender:req.user._id,

message,

messageType:messageType||"text",

attachment:attachment||"",

replyTo

});

conversation.lastMessage=newMessage._id;

conversation.lastMessageText=message;

conversation.lastMessageSender=req.user._id;

conversation.lastMessageTime=new Date();

await conversation.save();

await newMessage.populate(
"sender",
"fullName profileImage"
);

res.status(201).json({

success:true,

message:newMessage

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};


/* =====================================================
GET CONVERSATION MESSAGES
===================================================== */

exports.getMessages=async(req,res)=>{

try{

const messages=
await Message.find({

conversation:req.params.conversationId,

deletedFor:{
$ne:req.user._id
},

deletedForEveryone:false

})

.populate(

"sender",

"fullName profileImage"

)

.populate(

"replyTo"

)

.sort({

createdAt:1

});

res.json({

success:true,

count:messages.length,

messages

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};


/* =====================================================
EDIT MESSAGE
===================================================== */

exports.editMessage=async(req,res)=>{

try{

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(msg.sender.toString()!=req.user._id.toString()){

return res.status(403).json({

success:false,

message:"Unauthorized."

});

}

msg.message=req.body.message;

msg.edited=true;

msg.editedAt=new Date();

await msg.save();

res.json({

success:true,

message:msg

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};


/* =====================================================
DELETE FOR ME
===================================================== */

exports.deleteForMe=async(req,res)=>{

try{

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(!msg.deletedFor.includes(req.user._id)){

msg.deletedFor.push(req.user._id);

}

await msg.save();

res.json({

success:true,

message:"Deleted for you."

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};


/* =====================================================
DELETE FOR EVERYONE
===================================================== */

exports.deleteForEveryone=async(req,res)=>{

try{

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(msg.sender.toString()!=req.user._id.toString()){

return res.status(403).json({

success:false,

message:"Unauthorized."

});

}

msg.deletedForEveryone=true;

await msg.save();

res.json({

success:true,

message:"Deleted."

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};


/* =====================================================
MARK AS SEEN
===================================================== */

exports.markSeen=async(req,res)=>{

try{

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

if(!msg.seenBy.includes(req.user._id)){

msg.seenBy.push(req.user._id);

msg.seenAt=new Date();

}

await msg.save();

res.json({

success:true

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};


/* =====================================================
REACT TO MESSAGE
===================================================== */

exports.reactMessage=async(req,res)=>{

try{

const {

emoji

}=req.body;

const msg=
await Message.findById(req.params.id);

if(!msg){

return res.status(404).json({

success:false,

message:"Message not found."

});

}

msg.reactions.push({

member:req.user._id,

emoji

});

await msg.save();

res.json({

success:true,

message:msg

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};