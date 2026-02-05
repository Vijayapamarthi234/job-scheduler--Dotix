// Load environment variables
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const db = require("./db");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Webhook URL from environment
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!WEBHOOK_URL) {
  console.warn("⚠️ WEBHOOK_URL is not set in environment variables");
}

/* ========================
   Create Job
======================== */
app.post("/jobs", (req, res) => {
  const { taskName, payload, priority } = req.body;

  if (!taskName || !payload || !priority) {
    return res.status(400).json({
      error: "taskName, payload, and priority are required"
    });
  }

  const now = new Date().toISOString();

  db.run(
    `INSERT INTO jobs 
     (taskName, payload, priority, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      taskName,
      JSON.stringify(payload),
      priority,
      "pending",
      now,
      now
    ],
    function (err) {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ id: this.lastID });
    }
  );
});

/* ========================
   List Jobs
======================== */
app.get("/jobs", (req, res) => {
  db.all("SELECT * FROM jobs ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.error("DB Fetch Error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(rows);
  });
});

/* ========================
   Job Detail
======================== */
app.get("/jobs/:id", (req, res) => {
  const id = req.params.id;

  db.get("SELECT * FROM jobs WHERE id=?", [id], (err, row) => {
    if (err) {
      console.error("DB Detail Error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (!row) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(row);
  });
});

/* ========================
   Run Job
======================== */
app.post("/run-job/:id", async (req, res) => {
  const id = req.params.id;

  const now = new Date().toISOString();

  // Update to running
  db.run(
    "UPDATE jobs SET status='running', updatedAt=? WHERE id=?",
    [now, id]
  );

  // Simulate background processing
  setTimeout(async () => {
    const completedAt = new Date().toISOString();

    db.get("SELECT * FROM jobs WHERE id=?", [id], async (err, job) => {
      if (err || !job) {
        console.error("Job Fetch Error:", err);
        return;
      }

      // Update to completed
      db.run(
        "UPDATE jobs SET status='completed', updatedAt=? WHERE id=?",
        [completedAt, id]
      );

      const webhookPayload = {
        jobId: job.id,
        taskName: job.taskName,
        priority: job.priority,
        payload: JSON.parse(job.payload),
        completedAt
      };

      // Send webhook
      if (WEBHOOK_URL) {
        try {
          const response = await axios.post(
            WEBHOOK_URL,
            webhookPayload
          );

          console.log("✅ Webhook sent:", response.status);
        } catch (error) {
          console.error("❌ Webhook error:", error.message);
        }
      } else {
        console.warn("⚠️ Webhook skipped (URL not set)");
      }

    });

  }, 3000);

  res.json({ message: "Job started" });
});

/* ========================
   Health Check
======================== */
app.get("/", (req, res) => {
  res.send("Job Scheduler Backend is Running");
});

/* ========================
   Start Server
======================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
