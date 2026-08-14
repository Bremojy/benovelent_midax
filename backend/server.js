const express = require("express");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

require("dotenv").config();

// ===============================================
// APP
// ===============================================

const app = express();
const server = http.createServer(app);

// ===============================================
// SOCKET
// ===============================================

const { initSocket } = require("./sockets/socket");
initSocket(server);

// ===============================================
// ERROR MIDDLEWARE
// ===============================================

const {
    notFound,
    errorHandler,
} = require("./middleware/errorMiddleware");

// ===============================================
// ROUTES
// ===============================================

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const superadminRoutes = require("./routes/superadminRoutes");
const memberRoutes = require("./routes/memberRoutes");

const leaderRoutes = require("./routes/leaderRoutes");
const carouselRoutes = require("./routes/carouselRoutes");
const websiteRoutes = require("./routes/websiteRoutes");
const newsRoutes = require("./routes/newsRoutes");

const financeRoutes = require("./routes/financeRoutes");
const contributionRoutes = require("./routes/contributionRoutes");

const medicalSupportRoutes = require("./routes/medicalSupportRoutes");
const funeralSupportRoutes = require("./routes/funeralSupportRoutes");
const educationSupportRoutes = require("./routes/educationSupportRoutes");

const dependentRoutes = require("./routes/dependentRoutes");

const pollRoutes = require("./routes/pollRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const voteRoutes = require("./routes/voteRoutes");

const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const contactRoutes = require("./routes/contactRoutes");
const supportRequestRoutes = require("./routes/supportRequestRoutes");

const auditLogRoutes = require("./routes/auditLogRoutes");
const dataIntegrityRoutes = require("./routes/dataIntegrityRoutes");
const platformRoutes = require("./routes/platformRoutes");

// ===============================================
// MIDDLEWARE
// ===============================================

app.disable("x-powered-by");
try { app.use(require("helmet")({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })); } catch (_) { /* helmet optional during constrained builds */ }

const allowedOrigins = String(process.env.CORS_ORIGINS || "https://benovelent-midax.vercel.app,http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed by CORS."));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
        "Cache-Control",
        "Pragma",
    ],
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({
    extended: true,
    limit: "10mb",
}));

// ===============================================
// STATIC FILES
// ===============================================

const { uploadRoot, documentRoot } = require("./config/uploadConfig");

app.use("/uploads", express.static(uploadRoot, {
    maxAge: "7d",
    etag: true,
    lastModified: true,
}));
app.use("/documents", express.static(documentRoot));
app.use("/documents", express.static(path.join(__dirname, "..", "public", "documents")));

app.get("/documents/:filename", (req, res, next) => {
    const filename = String(req.params.filename || "").trim();
    if (!filename) {
        return next();
    }

    const candidates = [
        path.join(documentRoot, filename),
        path.join(__dirname, "..", "documents", filename),
        path.join(__dirname, "..", "public", "documents", filename),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return res.sendFile(candidate);
        }
    }

    if (/constitution/i.test(filename)) {
        const fallback = path.join(__dirname, "..", "public", "documents", "benevolent-midax-constitution.pdf");
        if (fs.existsSync(fallback)) {
            return res.sendFile(fallback);
        }
    }

    return next();
});

// ===============================================
// ROOT ROUTE
// ===============================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        application: "Benevolent Midax API",
        version: "2.0.0",
        status: "Running",
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/health", (req, res) => {
    const readyState = mongoose.connection.readyState;
    const database =
        readyState === 1
            ? "connected"
            : readyState === 2
                ? "connecting"
                : readyState === 3
                    ? "disconnecting"
                    : "disconnected";

    res.status(200).json({
        success: true,
        application: "Benevolent Midax API",
        status: "Running",
        database,
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
    });
});

// ===============================================
// API ROUTES
// ===============================================

// Authentication

app.use("/api/auth", authRoutes);

// Member

app.use("/api/member", memberRoutes);
app.use("/api/dependents", dependentRoutes);
app.use("/api/contributions", contributionRoutes);

// Support

app.use("/api/medical", medicalSupportRoutes);
app.use("/api/funeral", funeralSupportRoutes);
app.use("/api/education", educationSupportRoutes);

// Finance

app.use("/api/finance", financeRoutes);

// Communication

app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/member/support-requests", supportRequestRoutes);

// News & Website

app.use("/api/news", newsRoutes);
app.use("/api/leaders", leaderRoutes);
app.use("/api/carousel", carouselRoutes);
app.use("/api/website", websiteRoutes);

// Polls

app.use("/api/polls", pollRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/votes", voteRoutes);

// Administration

app.use("/api/admin", adminRoutes);
app.use("/api/superadmin", superadminRoutes);

// Audit

app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/superadmin/data-integrity", dataIntegrityRoutes);
app.use("/api/platform", platformRoutes);

// ===============================================
// NOT FOUND
// ===============================================

app.use(notFound);

// ===============================================
// GLOBAL ERROR HANDLER
// ===============================================

app.use(errorHandler);

// ===============================================
// DATABASE / SERVER STARTUP
// ===============================================

if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is missing. Create backend/.env before starting.");
    process.exit(1);
}

const PORT = process.env.PORT || 5000;
const { runMigrations } = require("./utils/runMigrations");

if (!server.listening) {
    server.listen(PORT, "0.0.0.0", () => {
        console.log("======================================");
        console.log(`🚀 Server Running on ${PORT}`);
        console.log(`🔌 Socket.IO     : Enabled`);
        console.log(`🛡 Environment   : ${process.env.NODE_ENV || "development"}`);
        console.log("======================================");
    });
}

let reconnectTimer;
const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
        console.log("✅ MongoDB Connected");
        try {
            await runMigrations();
        } catch (migrationError) {
            console.error("❌ Database migration failed:", migrationError.message);
        }
        if (reconnectTimer) { clearInterval(reconnectTimer); reconnectTimer = undefined; }
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err.message);
        if (!reconnectTimer) {
            reconnectTimer = setInterval(() => {
                connectDatabase().catch(() => {});
            }, 15000);
        }
    }
};

connectDatabase();
