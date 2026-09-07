require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { ensureRedis } = require("./config/redis");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const authorityRoutes = require("./routes/authorityRoutes");
const dsn = require("dns")

dsn.setServers(["1.1.1.1", "8.8.8.8"])

connectDB();
ensureRedis();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // required so the httpOnly refresh cookie is sent
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ status: "ok", version: "v3" }));

app.use("/api/auth", authRoutes);
app.use("/api/predict", predictionRoutes);
app.use("/api/authorities", authorityRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
