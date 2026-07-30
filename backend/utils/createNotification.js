const Notification = require("../models/Notification");

const createNotification = async ({
    recipient,
    recipientModel = "Member",

    sender = null,
    senderModel = "Member",

    title,
    message,

    type = "system",

    referenceId = null,
    referenceModel = "",

    icon = "notifications",
}) => {

    try {

        return await Notification.create({

            recipient,
            recipientModel,

            sender,
            senderModel,

            title,
            message,

            type,

            referenceId,
            referenceModel,

            icon,

        });

    }

    catch (error) {

        console.error("Notification Error:", error);

        return null;

    }

};

module.exports = createNotification;