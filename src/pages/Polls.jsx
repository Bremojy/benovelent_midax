import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Plus, RefreshCw, Vote } from "lucide-react";
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
      setPolls(Array.isArray(data?.polls) ? data.polls : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load polls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submitPoll = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const options = form.options
      .map((text) => ({ text: text.trim() }))
      .filter((item) => item.text);

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
      const { data } = await API.post(`/votes/${pollId}`, {
        selectedOptions: [optionId],
      });
      if (data?.success) {
        setVoted((current) => ({ ...current, [pollId]: optionId }));
        setMessage("Your vote has been recorded.");
        await load();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to record your vote.");
    }
  };

  return (
    <DashboardLayout>
      <div className="polls-page">
        <header className="polls-header">
          <div>
            <span>{isAdmin ? "COMMUNITY ENGAGEMENT" : "MEMBER VOICE"}</span>
            <h1>{isAdmin ? "Polling Centre" : "Community Polls"}</h1>
            <p>
              {isAdmin
                ? "Create transparent member polls and monitor live results."
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
                    {form.options.length > 2 && <button type="button" onClick={() => setForm({ ...form, options: form.options.filter((_, i) => i !== index) })}>×</button>}
                  </div>
                ))}
                <button type="button" className="poll-secondary" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>+ Add option</button>
              </div>
              <button className="poll-primary"><Plus size={17} /> Publish Poll</button>
            </form>
          </section>
        )}

        <section className="poll-list">
          {loading ? (
            <div className="poll-empty">Loading polls...</div>
          ) : polls.length === 0 ? (
            <div className="poll-empty"><Vote size={35} /><h3>No active polls</h3><p>New member polls will appear here when published.</p></div>
          ) : polls.map((poll) => (
            <article className="poll-card" key={poll._id}>
              <div className="poll-card-top">
                <div><span>COMMUNITY POLL</span><h2>{poll.title}</h2><p>{poll.description}</p></div>
                <BarChart3 size={25} />
              </div>
              <div className="poll-options">
                {(poll.options || []).map((option) => {
                  const percent = poll.totalVotes ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                  return (
                    <button
                      type="button"
                      className={`poll-choice ${voted[poll._id] === option._id ? "selected" : ""}`}
                      key={option._id}
                      disabled={isAdmin || Boolean(voted[poll._id])}
                      onClick={() => vote(poll._id, option._id)}
                    >
                      <div className="poll-choice-line"><span>{option.text}</span><strong>{percent}%</strong></div>
                      <span className="poll-bar"><i style={{ width: `${percent}%` }} /></span>
                    </button>
                  );
                })}
              </div>
              <footer><span>{poll.totalVotes || 0} votes</span><span>Ends {new Date(poll.endDate).toLocaleString("en-KE")}</span>{voted[poll._id] && <b><CheckCircle2 size={15} /> Voted</b>}</footer>
            </article>
          ))}
        </section>
      </div>
    </DashboardLayout>
  );
}
