const Conversation = require("../models/Conversation");
const Member = require("../models/Member");

/* =====================================================
CREATE CONVERSATION
===================================================== */

exports.createConversation = async(req,res)=>{

try{

const {participantId}=req.body;

const me=req.user._id;

if(me.toString()===participantId){

return res.status(400).json({

success:false,

message:"Cannot create conversation with yourself."

});

}

let conversation=await Conversation.findOne({

participants:{$all:[me,participantId]},

isGroup:false

});

if(conversation){

return res.json({

success:true,

conversation

});

}

conversation=await Conversation.create({

participants:[me,participantId]

});

await conversation.populate(

"participants",

"fullName profileImage online lastSeen"

);

res.status(201).json({

success:true,

conversation

});

}

catch(error){

console.error(error);

res.status(500).json({

success:false,

message:error.message

});

}

};



/* =====================================================
GET MY CONVERSATIONS
===================================================== */

exports.getMyConversations=async(req,res)=>{

try{

const conversations=await Conversation.find({

participants:req.user._id,

deletedFor:{$ne:req.user._id}

})

.populate(

"participants",

"fullName profileImage online lastSeen"

)

.populate(

"lastMessage"

)

.sort({

updatedAt:-1

});

res.json({

success:true,

count:conversations.length,

conversations

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
GET SINGLE CONVERSATION
===================================================== */

exports.getConversation=async(req,res)=>{

try{

const conversation=await Conversation.findById(

req.params.id

)

.populate(

"participants",

"fullName profileImage online lastSeen"

)

.populate(

"lastMessage"

);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

res.json({

success:true,

conversation

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
DELETE CONVERSATION FOR ME
===================================================== */

exports.deleteConversation=async(req,res)=>{

try{

const conversation=await Conversation.findById(

req.params.id

);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(!conversation.deletedFor.includes(req.user._id)){

conversation.deletedFor.push(req.user._id);

}

await conversation.save();

res.json({

success:true,

message:"Conversation removed."

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
PIN CONVERSATION
===================================================== */

exports.pinConversation=async(req,res)=>{

try{

const conversation=await Conversation.findById(

req.params.id

);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(!conversation.pinnedBy.includes(req.user._id)){

conversation.pinnedBy.push(req.user._id);

}

await conversation.save();

res.json({

success:true,

message:"Conversation pinned."

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
MUTE CONVERSATION
===================================================== */

exports.muteConversation=async(req,res)=>{

try{

const conversation=await Conversation.findById(

req.params.id

);

if(!conversation){

return res.status(404).json({

success:false,

message:"Conversation not found."

});

}

if(!conversation.mutedBy.includes(req.user._id)){

conversation.mutedBy.push(req.user._id);

}

await conversation.save();

res.json({

success:true,

message:"Conversation muted."

});

}

catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};