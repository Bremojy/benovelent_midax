const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");

const registerMessageSocket = require("./messageSocket");
const registerNotificationSocket = require("./notificationSocket");
const registerNewsSocket = require("./newsSocket");
const registerPollSocket = require("./pollSocket");
const SOCKET_SESSION_ROOM = "session:";
const SESSION_VERSION_FIELD = "sessionVersion";

let io;

const initSocket = (server) => {

    io = new Server(server, {

        cors: {
            origin: String(process.env.CORS_ORIGINS || "https://benovelent-midax.vercel.app,http://localhost:5173,http://127.0.0.1:5173").split(",").map((value) => value.trim()).filter(Boolean),
            methods: ["GET", "POST"],
            credentials: true,
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