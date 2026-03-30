const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { connectDB } = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error");

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

dotenv.config({ path: path.resolve(__dirname, ".env") });


const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
	}
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
	res.status(200).json({
		message: "Backend is running",
	});
});

app.get("/api/health", (req, res) => {
	res.status(200).json({
		status: "ok",
		uptime: process.uptime(),
		timestamp: new Date().toISOString(),
	});
});

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

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
	try {
		await connectDB();
		server.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
			console.log(`WebSocket server running on port ${PORT}`);
		});

		// WebSocket connection handler
		io.on("connection", (socket) => {
			console.log("A client connected:", socket.id);

			// Listen for tab_switch events from students
			socket.on("tab_switch", (data) => {
				console.log("Tab switch event received:", data);
				// Broadcast to all admin clients
				io.emit("admin_tab_switch", data);
			});

			socket.on("disconnect", () => {
				console.log("Client disconnected:", socket.id);
			});
		});

		// Make io available globally (optional, for use in controllers)
		app.set("io", io);
	} catch (error) {
		console.error("Failed to start server:", error.message);
		process.exit(1);
	}
};

startServer();
