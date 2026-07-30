const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const medicalSupportRoutes = require("./routes/medicalSupportRoutes");

require("dotenv").config();

// ===============================
// SOCKET
// ===============================
const { initSocket } = require("./sockets/socket");

// ===============================
// ROUTES
// ===============================
const dependentRoutes =
require("./routes/dependentRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const memberRoutes = require("./routes/memberRoutes");
const leaderRoutes = require("./routes/leaderRoutes");
const carouselRoutes = require("./routes/carouselRoutes");
const websiteRoutes = require("./routes/websiteRoutes");
const newsRoutes = require("./routes/newsRoutes");
const pollRoutes = require("./routes/pollRoutes");
const voteRoutes = require("./routes/voteRoutes");
const financeRoutes = require("./routes/financeRoutes");
const contributionRoutes = require("./routes/contributionRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const educationSupportRoutes =
require("./routes/educationSupportRoutes");
const auditLogRoutes =
require("./routes/auditLogRoutes");

const funeralSupportRoutes =
require("./routes/funeralSupportRoutes");

// ===============================
// APP
// ===============================
const app = express();
const server = http.createServer(app);

// ===============================
// SOCKET INIT
// ===============================
initSocket(server);

// ===============================
// MIDDLEWARE
// ===============================
app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===============================
// STATIC UPLOADS
// ===============================

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// ===============================
// ROOT
// ===============================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Benevolent Midax API Running",
        version: "1.0.0",
    });
});


// ===============================
// API ROUTES
// ===============================
app.use(
    "/api/dependents",
    dependentRoutes
);
app.use(
    "/api/audit-logs",
    auditLogRoutes
);

app.use("/api/medical", medicalSupportRoutes);
app.use("/api/auth", authRoutes);
app.use(
    "/api/funeral",
    funeralSupportRoutes
);
app.use("/api/admin", adminRoutes);
app.use("/api/member", memberRoutes);
app.use("/api/leaders", leaderRoutes);
app.use("/api/carousel", carouselRoutes);
app.use("/api/website", websiteRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api/votes", voteRoutes);
app.use(
  "/api/education",
  educationSupportRoutes
);
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
    message: "Route not found",
  });
});

// ===============================
// DATABASE
// ===============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📁 Uploads available at http://localhost:${PORT}/uploads`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
  });