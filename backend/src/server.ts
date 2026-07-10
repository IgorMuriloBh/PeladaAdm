import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import router from "./routes";
import { iniciarScheduler } from "./lib/scheduler";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || "uploads")));
app.use("/api", router);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
  iniciarScheduler();
});
