const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

const leadsRouter = require("./routes/leads");
const widgetsRouter = require("./routes/widgets");
const webhooksRouter = require("./routes/webhooks");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests, try again later" },
});
app.use("/api/leads", limiter);

// Serve widget static files
app.use("/widget", express.static(path.join(__dirname, "../../widget/dist")));

// Routes
app.use("/api/leads", leadsRouter);
app.use("/api/widgets", widgetsRouter);
app.use("/api/webhooks", webhooksRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Reach Widget API running on port ${PORT}`);
});
