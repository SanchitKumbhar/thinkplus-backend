const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const { connectDB } = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error");

// Routes
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const examRoutes = require("./routes/exam.routes");
const practiceRoutes = require("./routes/practice.routes");
const noticeRoutes = require("./routes/notice.routes");
const leaderboardRoutes = require("./routes/leaderboard.routes");
const monitoringRoutes = require("./routes/monitoring.routes");
const pyqRoutes = require("./routes/pyq.routes");
const profileRoutes = require("./routes/profile.routes");
const syllabusRoutes = require("./routes/syllabus.routes");

// Load env
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const server = http.createServer(app);

// ✅ CORS CONFIG (FIXED)
const corsOptions = {
  origin: "http://13.201.114.37",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions)); // enough ✅

// ✅ Handle preflight requests (VERY IMPORTANT)
app.options("*", cors(corsOptions));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "http://13.201.114.37",
    methods: ["GET", "POST"]
  }
});

// PORT
const PORT = process.env.PORT || 5000;

// Health routes
app.get("/", (req, res) => {
  res.status(200).json({ message: "Backend is running" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/notice", noticeRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/pyq", pyqRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/syllabus", syllabusRoutes);

// Error middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 WebSocket running on port ${PORT}`);
    });

    // Socket.IO events
    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("tab_switch", (data) => {
        console.log("Tab switch:", data);
        io.emit("admin_tab_switch", data);
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    // Make io available globally
    app.set("io", io);

  } catch (error) {
    console.error("❌ Server start failed:", error.message);
    process.exit(1);
  }
};

startServer();