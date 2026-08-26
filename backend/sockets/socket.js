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
const AUTH_COOKIE_NAME = "benevolent_access";

const parseCookies = (header = "") => String(header).split(";").reduce((out, chunk) => {
    const index = chunk.indexOf("=");
    if (index < 0) return out;
    const key = chunk.slice(0, index).trim();
    const value = chunk.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
    return out;
}, {});

let io;

const initSocket = (server) => {

    const normalizeOrigin = (value) => {
        try {
            const raw = String(value || "").trim();
            if (!raw) return "";
            return new URL(raw).origin.toLowerCase();
        } catch {
            return "";
        }
    };

    const allowedOrigins = String(
        process.env.CORS_ORIGINS ||
        "https://benovelent-midax.vercel.app,http://localhost:5173,http://127.0.0.1:5173"
    )
        .split(",")
        .map(normalizeOrigin)
        .filter(Boolean);

    const allowVercelPreviews = String(
        process.env.ALLOW_VERCEL_PREVIEWS || "true"
    ).toLowerCase() === "true";

    const isAllowedOrigin = (origin) => {
        if (!origin) return true;
        const normalizedOrigin = normalizeOrigin(origin);
        if (!normalizedOrigin) return false;
        if (allowedOrigins.includes(normalizedOrigin)) return true;

        if (allowVercelPreviews) {
            try {
                const url = new URL(normalizedOrigin);
                return (
                    url.protocol === "https:" &&
                    /^benovelent-midax(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(url.hostname)
                );
            } catch {
                return false;
            }
        }

        return false;
    };

    io = new Server(server, {
        cors: {
            origin(origin, callback) {
                if (isAllowedOrigin(origin)) return callback(null, true);
                return callback(new Error("Origin not allowed by Socket.IO CORS."));
            },
            methods: ["GET", "POST"],
            credentials: true,
        }
    });

    // Authenticate every Socket.IO connection with the same JWT/session rules
    // used by the HTTP API. This prevents anonymous sockets from joining rooms
    // or emitting message/call events.
    io.use(async (socket, next) => {
        try {
            const cookies = parseCookies(socket.handshake.headers?.cookie || "");
            const token = cookies[AUTH_COOKIE_NAME] || socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) return next(new Error("AUTH_REQUIRED"));
            const decoded = jwt.verify(token, process.env.JWT_SECRET, {
                algorithms: ["HS256"],
                issuer: "benevolent-midax",
                audience: "benevolent-midax-users",
            });
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