const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// ===============================
// SOCKET.IO
// ===============================

const { initSocket } = require("./sockets/socket");

// ===============================
// ROUTES
// ===============================

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const memberRoutes = require("./routes/memberRoutes");
const leaderRoutes = require("./routes/leaderRoutes");
const carouselRoutes = require("./routes/carouselRoutes");

// These will be used as we continue building
const websiteRoutes = require("./routes/websiteRoutes");
const newsRoutes = require("./routes/newsRoutes");
const pollRoutes = require("./routes/pollRoutes");
const voteRoutes = require("./routes/voteRoutes");
const financeRoutes = require("./routes/financeRoutes");
const contributionRoutes = require("./routes/contributionRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// ===============================
// EXPRESS APP
// ===============================

const app = express();
const server = http.createServer(app);

// ===============================
// SOCKET INITIALIZATION
// ===============================

initSocket(server);

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// ===============================
// ROOT
// ===============================

app.get("/", (req, res) => {

    res.json({

        success: true,

        message: "Benevolent Midax API Running",

        version: "1.0.0"

    });

});

// ===============================
// API ROUTES
// ===============================

app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/members", memberRoutes);

app.use("/api/leaders", leaderRoutes);

app.use("/api/carousel", carouselRoutes);

// New Modules

app.use("/api/website", websiteRoutes);

app.use("/api/news", newsRoutes);

app.use("/api/polls", pollRoutes);

app.use("/api/votes", voteRoutes);

app.use("/api/finance", financeRoutes);

app.use("/api/contributions", contributionRoutes);

app.use("/api/conversations", conversationRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/notifications", notificationRoutes);

// ===============================
// 404
// ===============================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "Route not found"

    });

});

// ===============================
// DATABASE
// ===============================

mongoose.connect(process.env.MONGO_URI)

.then(() => {

    console.log("MongoDB Connected");

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {

        console.log(`Server running on port ${PORT}`);

    });

})

.catch((err) => {

    console.log(err);

});