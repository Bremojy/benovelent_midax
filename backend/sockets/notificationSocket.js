const Notification = require("../models/Notification");
const { getSocket } = require("./onlineUsers");

module.exports = (io, socket) => {

    /* ===========================================
       REGISTER USER
    =========================================== */

    socket.on("notification-register", (userId) => {

        if (!userId) return;

        socket.join(userId);

    });




    /* ===========================================
       SEND NOTIFICATION
    =========================================== */

    socket.on("send-notification", async (data) => {

        try {

            const {

                recipient,

                sender,

                title,

                message,

                type,

                referenceId,

                referenceModel

            } = data;

            const notification = await Notification.create({

                recipient,

                sender,

                title,

                message,

                type,

                referenceId,

                referenceModel

            });

            const receiverSocket = getSocket(recipient);

            if (receiverSocket) {

                io.to(receiverSocket).emit(

                    "new-notification",

                    notification

                );

            }

            io.to(recipient).emit(

                "notification-count"

            );

        }

        catch (err) {

            console.log(err);

        }

    });




    /* ===========================================
       MARK AS READ
    =========================================== */

    socket.on("notification-read", async (notificationId) => {

        try {

            const notification = await Notification.findById(notificationId);

            if (!notification) return;

            notification.isRead = true;

            notification.readAt = new Date();

            await notification.save();

            io.to(notification.recipient.toString()).emit(

                "notification-updated",

                notification

            );

        }

        catch (err) {

            console.log(err);

        }

    });




    /* ===========================================
       MARK ALL AS READ
    =========================================== */

    socket.on("read-all-notifications", async (userId) => {

        try {

            await Notification.updateMany(

                {

                    recipient: userId,

                    isRead: false

                },

                {

                    isRead: true,

                    readAt: new Date()

                }

            );

            io.to(userId).emit(

                "notifications-cleared"

            );

        }

        catch (err) {

            console.log(err);

        }

    });




    /* ===========================================
       GET UNREAD COUNT
    =========================================== */

    socket.on("get-notification-count", async (userId) => {

        try {

            const count = await Notification.countDocuments({

                recipient: userId,

                isRead: false

            });

            socket.emit(

                "notification-count",

                count

            );

        }

        catch (err) {

            console.log(err);

        }

    });




    /* ===========================================
       DELETE NOTIFICATION
    =========================================== */

    socket.on("delete-notification", async (notificationId) => {

        try {

            const notification = await Notification.findById(notificationId);

            if (!notification) return;

            const recipient = notification.recipient.toString();

            await notification.deleteOne();

            io.to(recipient).emit(

                "notification-deleted",

                notificationId

            );

        }

        catch (err) {

            console.log(err);

        }

    });

};