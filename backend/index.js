require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const db = require("./db");

const app = express();

// ✅ CORS (Allow Vercel)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ✅ Webhook from ENV
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Root check
app.get("/", (req, res) => {
  res.send("Job Scheduler Backend is Running");
});

// =====================
// CREATE JOB
// =====================
app.post("/jobs", (req, res) => {

  const { taskName, payload, priority } = req.body;

  if (!taskName || !payload || !priority) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const now = new Date().toISOString();

  db.run(
    `INSERT INTO jobs (taskName, payload, priority, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [taskName, JSON.stringify(payload), priority, "pending", now, now],
    function (err) {

      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB insert failed" });
      }

      res.json({ id: this.lastID });
    }
  );
});


// =====================
// LIST JOBS
// =====================
app.get("/jobs", (req, res) => {

  db.all("SELECT * FROM jobs ORDER BY id DESC", [], (err, rows) => {

    if (err) {
      console.error(err);
      return res.status(500).json({ error: "DB fetch failed" });
    }

    res.json(rows);
  });
});


// =====================
// JOB DETAILS
// =====================
app.get("/jobs/:id", (req, res) => {

  db.get(
    "SELECT * FROM jobs WHERE id=?",
    [req.params.id],
    (err, row) => {

      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error" });
      }

      res.json(row);
    }
  );
});


// =====================
// RUN JOB
// =====================
app.post("/run-job/:id", (req, res) => {

  const id = req.params.id;

  const now = new Date().toISOString();

  // Set running
  db.run(
    "UPDATE jobs SET status='running', updatedAt=? WHERE id=?",
    [now, id]
  );

  // Simulate background work
  setTimeout(async () => {

    const completedAt = new Date().toISOString();

    db.get(
      "SELECT * FROM jobs WHERE id=?",
      [id],
      async (err, job) => {

        if (!job) return;

        // Set completed
        db.run(
          "UPDATE jobs SET status='completed', updatedAt=? WHERE id=?",
          [completedAt, id]
        );

        // Webhook payload
        const payload = {
          jobId: job.id,
          taskName: job.taskName,
          priority: job.priority,
          payload: JSON.parse(job.payload),
          completedAt
        };

        // Send webhook
        try {
          const response = await axios.post(WEBHOOK_URL, payload);
          console.log("✅ Webhook sent:", response.status);
        } catch (e) {
          console.log("❌ Webhook error:", e.message);
        }

      }
    );

  }, 3000);

  res.json({ message: "Job started" });
});


// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Backend running on port", PORT);
});
