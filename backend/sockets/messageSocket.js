const Member = require("../models/Member");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const {

    addUser,

    removeUser,

    getSocket

} = require("./onlineUsers");

module.exports = (io, socket) => {

    /* ===========================================
       MEMBER ONLINE
    =========================================== */

    socket.on("user-online", async (userId) => {

        if (!userId) return;

        addUser(userId, socket.id);

        await Member.findByIdAndUpdate(userId, {

            online: true,

            socketId: socket.id,

            lastSeen: new Date()

        });

        socket.join(userId);

        io.emit("online-users");

    });



    /* ===========================================
       JOIN CONVERSATION
    =========================================== */

    socket.on("join-conversation", (conversationId) => {

        socket.join(conversationId);

    });



    /* ===========================================
       SEND MESSAGE
    =========================================== */

    socket.on("send-message", async (data) => {

        try {

            const {

                conversationId,

                sender,

                receiver,

                text,

                image,

                file,

                replyTo

            } = data;

            const message = await Message.create({

                conversation: conversationId,

                sender,

                receiver,

                text,

                image,

                file,

                replyTo,

                delivered: false,

                seen: false

            });

            await Conversation.findByIdAndUpdate(

                conversationId,

                {

                    lastMessage: message._id,

                    updatedAt: new Date()

                }

            );

            io.to(conversationId).emit(

                "new-message",

                message

            );

            const receiverSocket = getSocket(receiver);

            if (receiverSocket) {

                io.to(receiverSocket).emit(

                    "message-delivered",

                    {

                        messageId: message._id

                    }

                );

                message.delivered = true;

                await message.save();

            }

        }

        catch (err) {

            console.log(err);

        }

    });



    /* ===========================================
       TYPING
    =========================================== */

    socket.on(

        "typing",

        ({ conversationId, sender }) => {

            socket.to(conversationId).emit(

                "typing",

                sender

            );

        }

    );



    /* ===========================================
       STOP TYPING
    =========================================== */

    socket.on(

        "stop-typing",

        ({ conversationId, sender }) => {

            socket.to(conversationId).emit(

                "stop-typing",

                sender

            );

        }

    );



    /* ===========================================
       MESSAGE SEEN
    =========================================== */

    socket.on(

        "seen-message",

        async ({ messageId }) => {

            const message = await Message.findById(messageId);

            if (!message) return;

            message.seen = true;

            await message.save();

            io.to(message.sender.toString()).emit(

                "message-seen",

                messageId

            );

        }

    );



    /* ===========================================
       MEMBER OFFLINE
    =========================================== */

    socket.on("disconnect", async () => {

        removeUser(socket.id);

        await Member.findOneAndUpdate(

            {

                socketId: socket.id

            },

            {

                online: false,

                socketId: "",

                lastSeen: new Date()

            }

        );

        io.emit("online-users");

        console.log(

            "Disconnected:",

            socket.id

        );

    });

};