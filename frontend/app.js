const { useState, useEffect } = React;

function App() {

  // States
  const [jobs, setJobs] = useState([]);
  const [taskName, setTaskName] = useState("");
  const [payload, setPayload] = useState("{}");
  const [priority, setPriority] = useState("Low");

  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [selectedJob, setSelectedJob] = useState(null);

  // Load jobs
  const load = async () => {
    const res = await axios.get("http://localhost:5000/jobs");
    setJobs(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  // Create job
  const createJob = async () => {

    try {
      JSON.parse(payload);
    } catch {
      alert("Invalid JSON in Payload");
      return;
    }

    await axios.post("http://localhost:5000/jobs", {
      taskName,
      payload: JSON.parse(payload),
      priority
    });

    setTaskName("");
    setPayload("{}");

    load();
  };

  // Run job
  const runJob = async (id) => {
    await axios.post(`http://localhost:5000/run-job/${id}`);
    load();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">

      <h1 className="text-3xl font-bold mb-4">Job Scheduler</h1>

      {/* Filters */}
      <div className="bg-white p-3 rounded shadow mb-4 flex gap-6">

        <div>
          <label>Status:</label>
          <select
            className="border ml-2 p-1"
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>pending</option>
            <option>running</option>
            <option>completed</option>
          </select>
        </div>

        <div>
          <label>Priority:</label>
          <select
            className="border ml-2 p-1"
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option>All</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>

      </div>

      {/* Create Job */}
      <div className="bg-white p-4 rounded shadow mb-6">

        <h2 className="font-semibold mb-2">Create Job</h2>

        <input
          className="border p-2 w-full mb-2"
          placeholder="Task Name"
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
        />

        <textarea
          className="border p-2 w-full mb-2"
          rows="3"
          value={payload}
          onChange={e => setPayload(e.target.value)}
        />

        <select
          className="border p-2 mb-2"
          value={priority}
          onChange={e => setPriority(e.target.value)}
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        <br />

        <button
          onClick={createJob}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create
        </button>

      </div>

      {/* Jobs Table */}
      <table className="w-full bg-white shadow rounded">

        <thead className="bg-gray-200">
          <tr>
            <th className="p-2">ID</th>
            <th>Task</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          {jobs
            .filter(j => {

              if (statusFilter !== "All" && j.status !== statusFilter) {
                return false;
              }

              if (priorityFilter !== "All" && j.priority !== priorityFilter) {
                return false;
              }

              return true;

            })
            .map(j => (

              <tr
                key={j.id}
                className="border-t text-center cursor-pointer hover:bg-gray-100"
                onClick={() => setSelectedJob(j)}
              >

                <td className="p-2">{j.id}</td>
                <td>{j.taskName}</td>
                <td>{j.priority}</td>
                <td>{j.status}</td>

                <td>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      runJob(j.id);
                    }}
                    className="bg-green-600 text-white px-2 py-1 rounded"
                  >
                    Run
                  </button>
                </td>

              </tr>

            ))}

        </tbody>

      </table>

      {/* Job Details */}
      {selectedJob && (

        <div className="bg-white p-4 mt-6 rounded shadow">

          <h2 className="text-xl font-bold mb-2">
            Job Details (ID: {selectedJob.id})
          </h2>

          <p><b>Task:</b> {selectedJob.taskName}</p>
          <p><b>Priority:</b> {selectedJob.priority}</p>
          <p><b>Status:</b> {selectedJob.status}</p>

          <p className="mt-2"><b>Payload:</b></p>

          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(JSON.parse(selectedJob.payload), null, 2)}
          </pre>

          <button
            className="mt-3 bg-red-500 text-white px-3 py-1 rounded"
            onClick={() => setSelectedJob(null)}
          >
            Close
          </button>

        </div>

      )}

    </div>
  );
}

// Render
ReactDOM
  .createRoot(document.getElementById("root"))
  .render(<App />);
