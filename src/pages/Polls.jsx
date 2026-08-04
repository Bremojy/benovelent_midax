
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, FileDown, Plus, RefreshCw, Trash2, Vote } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../services/api";
import "./Polls.css";

export default function Polls({ mode = "member" }) {
  const isAdmin = mode === "admin" || mode === "superadmin";
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [voted, setVoted] = useState({});
  const [resultsByPoll, setResultsByPoll] = useState({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    options: ["", ""],
    pollType: "single",
    endDate: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await API.get("/polls");
      const items = Array.isArray(data?.polls) ? data.polls : [];
      setPolls(items);
      if (isAdmin) {
        await Promise.all(items.map((poll) => loadResults(poll._id)));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load polls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [mode]);

  const loadResults = async (pollId) => {
    try {
      const { data } = await API.get(`/polls/${pollId}/results`);
      setResultsByPoll((current) => ({ ...current, [pollId]: data }));
      return data;
    } catch (err) {
      return null;
    }
  };

  const submitPoll = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const options = form.options.map((text) => ({ text: text.trim() })).filter((item) => item.text);

    if (!form.title.trim() || options.length < 2 || !form.endDate) {
      setError("Enter a title, at least two options and an end date.");
      return;
    }

    try {
      await API.post("/polls", {
        ...form,
        title: form.title.trim(),
        options,
        active: true,
        showResults: true,
      });
      setForm({ title: "", description: "", options: ["", ""], pollType: "single", endDate: "" });
      setMessage("Poll published successfully. Members can now vote.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to create poll.");
    }
  };

  const vote = async (pollId, optionId) => {
    try {
      setError("");
      const { data } = await API.post(`/votes/${pollId}`, { selectedOptions: [optionId] });
      if (data?.success) {
        setVoted((current) => ({ ...current, [pollId]: optionId }));
        setMessage("Your vote has been recorded.");
        await load();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to record your vote.");
    }
  };

  const deletePoll = async (pollId) => {
    if (!window.confirm("Delete this poll?")) return;
    try {
      setError("");
      await API.delete(`/polls/${pollId}`);
      setMessage("Poll deleted successfully.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to delete poll.");
    }
  };

  const printResults = async (poll) => {
    const data = resultsByPoll[poll._id] || (await loadResults(poll._id)) || {};
    const statistics = Array.isArray(data?.statistics) ? data.statistics : [];
    const win = window.open("", "_blank", "width=980,height=720");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${escapeHtml(poll.title || "Poll Results")}</title>
          <style>
            body{font-family:Arial,sans-serif;padding:24px;color:#1f2328}
            h1{margin:0 0 8px}
            .meta{color:#666;margin-bottom:18px}
            table{width:100%;border-collapse:collapse}
            th,td{padding:10px;border-bottom:1px solid #e7e7e7;text-align:left}
            th{text-transform:uppercase;font-size:12px;letter-spacing:.06em;color:#666}
            .bar{height:10px;border-radius:999px;background:#ff7a0018;overflow:hidden}
            .bar > div{height:100%;background:#ff7a00}
          </style>
        </head>
        <body>
          <h1>${escapeHtml(poll.title || "Poll Results")}</h1>
          <div class="meta">Total votes: ${Number(data?.totalVotes || poll.totalVotes || 0)}</div>
          <table>
            <thead><tr><th>Option</th><th>Votes</th><th>Percentage</th></tr></thead>
            <tbody>
              ${statistics.map((row) => `
                <tr>
                  <td>${escapeHtml(row.option || "")}</td>
                  <td>${Number(row.votes || 0)}</td>
                  <td>
                    <div>${Number(row.percentage || 0).toFixed(2)}%</div>
                    <div class="bar"><div style="width:${Number(row.percentage || 0)}%"></div></div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const adminPolls = useMemo(() => polls, [polls]);

  return (
    <DashboardLayout>
      <div className="polls-page">
        <header className="polls-header">
          <div>
            <span>{isAdmin ? "COMMUNITY ENGAGEMENT" : "MEMBER VOICE"}</span>
            <h1>{isAdmin ? "Polling Centre" : "Community Polls"}</h1>
            <p>
              {isAdmin
                ? "Create polls, delete outdated ones, view live results and print detailed reports."
                : "Have your say on Benevolent Midax decisions and community matters."}
            </p>
          </div>
          <button className="poll-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={17} /> Refresh
          </button>
        </header>

        {message && <div className="poll-alert success">{message}</div>}
        {error && <div className="poll-alert error">{error}</div>}

        {isAdmin && (
          <section className="poll-create-card">
            <div className="poll-card-heading">
              <div><Plus size={20} /></div>
              <div><span>ADMIN TOOL</span><h2>Create a member poll</h2></div>
            </div>
            <form onSubmit={submitPoll}>
              <div className="poll-form-grid">
                <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Preferred community support priority" /></label>
                <label>End date<input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
                <label className="full">Description<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain what members are voting on." /></label>
                <label>Poll type<select value={form.pollType} onChange={(e) => setForm({ ...form, pollType: e.target.value })}><option value="single">Single choice</option><option value="multiple">Multiple choice</option></select></label>
              </div>
              <div className="poll-options-editor">
                <strong>Options</strong>
                {form.options.map((option, index) => (
                  <div className="poll-option-input" key={index}>
                    <input value={option} onChange={(e) => {
                      const next = [...form.options]; next[index] = e.target.value; setForm({ ...form, options: next });
                    }} placeholder={`Option ${index + 1}`} />
                    {form.options.length > 2 && (
                      <button type="button" onClick={() => setForm({ ...form, options: form.options.filter((_, i) => i !== index) })}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="poll-add-option" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>
                  Add option
                </button>
              </div>
              <button type="submit" className="poll-submit-btn">Publish poll</button>
            </form>
          </section>
        )}

        <section className="polls-list">
          {loading ? (
            <div className="poll-empty">Loading polls...</div>
          ) : polls.length === 0 ? (
            <div className="poll-empty">No polls available.</div>
          ) : (
            polls.map((poll) => {
              const results = resultsByPoll[poll._id] || {};
              const statistics = Array.isArray(results.statistics) ? results.statistics : [];
              const totalVotes = Number(results.totalVotes ?? poll.totalVotes ?? 0);
              const closed = Boolean(poll.active === false || new Date(poll.endDate || 0).getTime() < Date.now());
              return (
                <article className="poll-card" key={poll._id}>
                  <div className="poll-card-top">
                    <div>
                      <span className="poll-tag">{closed ? "Closed" : "Live"}</span>
                      <h2>{poll.title}</h2>
                      <p>{poll.description || "No description provided."}</p>
                    </div>
                    <div className="poll-card-actions">
                      {isAdmin && <button type="button" className="poll-mini-btn danger" onClick={() => deletePoll(poll._id)}><Trash2 size={15} /> Delete</button>}
                      {(closed || isAdmin) && <button type="button" className="poll-mini-btn" onClick={() => printResults(poll)}><FileDown size={15} /> Print results</button>}
                    </div>
                  </div>

                  <div className="poll-meta">
                    <span><Vote size={14} /> {totalVotes} votes</span>
                    <span><BarChart3 size={14} /> {closed ? "Results available" : "Live voting"}</span>
                  </div>

                  <div className="poll-options">
                    {Array.isArray(poll.options) && poll.options.map((option) => {
                      const optionId = option._id || option.id || option.optionId;
                      const result = statistics.find((item) => String(item.optionId) === String(optionId));
                      const percent = Number(result?.percentage || 0);
                      return (
                        <button
                          type="button"
                          key={optionId}
                          className="poll-option"
                          onClick={() => !isAdmin && vote(poll._id, optionId)}
                          disabled={isAdmin || voted[poll._id] === optionId}
                        >
                          <div className="poll-option-head">
                            <strong>{option.text || option.label || option.name}</strong>
                            {voted[poll._id] === optionId && <CheckCircle2 size={15} />}
                          </div>
                          <div className="poll-bar"><span style={{ width: `${percent}%` }} /></div>
                          <small>{Number(result?.votes || option.votes || 0)} votes • {percent.toFixed(1)}%</small>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function escapeHtml(input) {
  return String(input || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[m]);
}
