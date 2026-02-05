
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const WEBHOOK_URL = "https://webhook.site/8979e4e6-0f16-4a54-bba7-d6a154551fa3";

// Create Job
app.post("/jobs", (req, res) => {
  const { taskName, payload, priority } = req.body;

  const now = new Date().toISOString();

  db.run(
    `INSERT INTO jobs (taskName, payload, priority, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [taskName, JSON.stringify(payload), priority, "pending", now, now],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

// List Jobs
app.get("/jobs", (req, res) => {
  db.all("SELECT * FROM jobs", [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// Job Detail
app.get("/jobs/:id", (req, res) => {
  db.get("SELECT * FROM jobs WHERE id=?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json(err);
    res.json(row);
  });
});

// Run Job
app.post("/run-job/:id", async (req, res) => {
  const id = req.params.id;
  const now = new Date().toISOString();

  db.run("UPDATE jobs SET status='running', updatedAt=? WHERE id=?", [now, id]);

  setTimeout(async () => {
    const completedAt = new Date().toISOString();

    db.get("SELECT * FROM jobs WHERE id=?", [id], async (err, job) => {
      if (!job) return;

      db.run(
        "UPDATE jobs SET status='completed', updatedAt=? WHERE id=?",
        [completedAt, id]
      );

      const payload = {
        jobId: job.id,
        taskName: job.taskName,
        priority: job.priority,
        payload: JSON.parse(job.payload),
        completedAt
      };

      try {
        const response = await axios.post(WEBHOOK_URL, payload);
        console.log("Webhook sent:", response.status);
      } catch (e) {
        console.log("Webhook error:", e.message);
      }
    });
  }, 3000);

  res.json({ message: "Job started" });
});

app.listen(5000, () => console.log("Backend running on 5000"));
