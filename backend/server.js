const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

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
const voteRoutes = require("./routes/voteRoutes");

const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const auditLogRoutes = require("./routes/auditLogRoutes");

// ===============================================
// MIDDLEWARE
// ===============================================

app.disable("x-powered-by");

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({
    extended: true,
    limit: "10mb",
}));

// ===============================================
// STATIC FILES
// ===============================================

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// ===============================================
// ROOT ROUTE
// ===============================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        application: "Benevolent Midax API",
        version: "1.0.0",
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

// News & Website

app.use("/api/news", newsRoutes);
app.use("/api/leaders", leaderRoutes);
app.use("/api/carousel", carouselRoutes);
app.use("/api/website", websiteRoutes);

// Polls

app.use("/api/polls", pollRoutes);
app.use("/api/votes", voteRoutes);

// Administration

app.use("/api/admin", adminRoutes);
app.use("/api/superadmin", superadminRoutes);

// Audit

app.use("/api/audit-logs", auditLogRoutes);

// ===============================================
// NOT FOUND
// ===============================================

app.use(notFound);

// ===============================================
// GLOBAL ERROR HANDLER
// ===============================================

app.use(errorHandler);

// ===============================================
// DATABASE
// ===============================================

if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is missing. Create backend/.env before starting.");
    process.exit(1);
}

mongoose
    .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
    })
    .then(() => {

        console.log("======================================");
        console.log("✅ MongoDB Connected");
        console.log("======================================");

        const PORT = process.env.PORT || 5000;

        server.listen(PORT, "0.0.0.0", () => {

            console.log("======================================");
            console.log(`🚀 Server Running`);
            console.log(`🌍 Port          : ${PORT}`);
            console.log(`📁 Upload Folder : /uploads`);
            console.log(`🔌 Socket.IO     : Enabled`);
            console.log(`🛡 Environment   : ${process.env.NODE_ENV || "development"}`);
            console.log("======================================");

        });

    })
    .catch((err) => {

        console.error("======================================");
        console.error("❌ MongoDB Connection Failed");
        console.error(err.message);
        console.error("======================================");

    });