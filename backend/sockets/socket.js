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

    // Authenticate every Socket.IO connection with the same JWT/session rules
    // used by the HTTP API. This prevents anonymous sockets from joining rooms
    // or emitting message/call events.
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) return next(new Error("AUTH_REQUIRED"));
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userType = String(decoded.role || decoded.userType || "").toLowerCase();
            const UserModel = userType === "superadmin" ? SuperAdmin : userType === "admin" ? Admin : Member;
            const user = await UserModel.findById(decoded.id || decoded.userId || decoded._id).select("_id role status sessionVersion fullName").lean();
            if (!user || (user.status && user.status !== "active")) return next(new Error("AUTH_INVALID"));
            if (Number(decoded.sessionVersion ?? 0) !== Number(user.sessionVersion ?? 0)) return next(new Error("SESSION_REPLACED"));
            socket.user = user;
            socket.userRole = userType;
            socket.sessionVersion = Number(user.sessionVersion || 0);
            socket.join(`user:${String(user._id)}`);
            socket.join(`session:${String(user._id)}`);
            next();
        } catch (error) {
            next(new Error(error?.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "AUTH_INVALID"));
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