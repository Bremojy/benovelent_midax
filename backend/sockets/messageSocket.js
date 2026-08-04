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
        socket.join(String(userId));

        // Calls only need the Socket.IO room. Online-state persistence is
        // best-effort so an admin/superadmin account cannot break signaling.
        try {
            await Member.findByIdAndUpdate(userId, {
                online: true,
                socketId: socket.id,
                lastSeen: new Date()
            });
        } catch (err) {
            console.warn("Could not persist member online state:", err.message);
        }

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
                text,
                image,
                file,
                replyTo,
                messageType,
                messageId,
            } = data || {};

            if (!conversationId) return;

            io.to(conversationId).emit("new-message", {
                _id: messageId,
                conversation: conversationId,
                sender,
                message: text || "",
                attachment: image || file || "",
                messageType: messageType || (image || file ? "image" : "text"),
                replyTo,
                createdAt: new Date(),
            });
        }
        catch (err) {
            console.log(err);
        }
    });

    /* ===========================================
       WEBRTC CALL SIGNALING
    =========================================== */
    socket.on("call-user", ({ to, conversationId, callType, offer, callerUserId, callerName }) => {
        if (!to || !offer) return;
        io.to(String(to)).emit("incoming-call", {
            from: socket.id,
            callerUserId: String(callerUserId || ""),
            callerName: callerName || "Member",
            conversationId,
            callType: callType === "video" ? "video" : "audio",
            offer,
        });
    });
    socket.on("call-rejected", ({ to }) => {
        if (to) io.to(String(to)).emit("call-rejected");
    });
    socket.on("call-answer", ({ to, answer }) => { if (to && answer) io.to(String(to)).emit("call-answered", { answer }); });
    socket.on("ice-candidate", ({ to, candidate }) => { if (to && candidate) io.to(String(to)).emit("ice-candidate", { candidate }); });
    socket.on("end-call", ({ to }) => { if (to) io.to(String(to)).emit("call-ended"); });

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