const { Server } = require("socket.io");

const registerMessageSocket = require("./messageSocket");
const registerNotificationSocket = require("./notificationSocket");
const registerNewsSocket = require("./newsSocket");
const registerPollSocket = require("./pollSocket");

let io;

const initSocket = (server) => {

    io = new Server(server, {

        cors: {

            origin: "*",

            methods: ["GET", "POST"]

        }

    });

    io.on("connection", (socket) => {

        console.log("User Connected:", socket.id);

        registerMessageSocket(io, socket);

        registerNotificationSocket(io, socket);

        registerNewsSocket(io, socket);

        registerPollSocket(io, socket);

        socket.on("disconnect", () => {

            console.log("User Disconnected:", socket.id);

        });

    });

};

const getIO = () => io;

module.exports = {

    initSocket,

    getIO

};