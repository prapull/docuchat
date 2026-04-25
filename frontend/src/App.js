import { useState, useRef, useEffect } from "react";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        setUploaded(true);
        setFilename(file.name);
        setMessages([{ role: "system", text: `✅ "${file.name}" uploaded. Ask anything!` }]);
      } else {
        alert(data.detail || "Upload failed");
      }
    } catch {
      alert("Backend not reachable. Is uvicorn running?");
    }
    setUploading(false);
  }

  async function handleSend() {
    if (!question.trim() || !uploaded) return;
    const q = question.trim();
    setMessages(m => [...m, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "bot", text: data.answer || data.detail }]);
    } catch {
      setMessages(m => [...m, { role: "bot", text: "Error reaching backend." }]);
    }
    setLoading(false);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>📄 DocuChat</h1>
          <p style={styles.subtitle}>Upload a PDF and chat with it using AI</p>
        </div>

        {/* Upload */}
        <div style={styles.uploadBox}>
          <label style={styles.uploadBtn}>
            {uploading ? "Processing..." : uploaded ? `📎 ${filename}` : "⬆ Upload PDF"}
            <input type="file" accept=".pdf" onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
          </label>
        </div>

        {/* Chat window */}
        <div style={styles.chatBox}>
          {messages.length === 0 && (
            <p style={styles.placeholder}>Upload a PDF to get started.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={m.role === "user" ? styles.userMsg : m.role === "bot" ? styles.botMsg : styles.sysMsg}>
              {m.text}
            </div>
          ))}
          {loading && <div style={styles.botMsg}>⏳ Thinking...</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={styles.inputRow}>
          <textarea
            style={styles.input}
            rows={2}
            placeholder={uploaded ? "Ask a question..." : "Upload a PDF first"}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            disabled={!uploaded || loading}
          />
          <button style={styles.sendBtn} onClick={handleSend} disabled={!uploaded || loading || !question.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" },
  container: { width: "100%", maxWidth: 700, background: "#1e293b", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", height: "90vh" },
  header: { background: "#6366f1", padding: "20px 24px" },
  title: { margin: 0, color: "#fff", fontSize: 24 },
  subtitle: { margin: "4px 0 0", color: "#c7d2fe", fontSize: 14 },
  uploadBox: { padding: "12px 24px", borderBottom: "1px solid #334155" },
  uploadBtn: { background: "#334155", color: "#94a3b8", border: "1px dashed #475569", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14 },
  chatBox: { flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10 },
  placeholder: { color: "#475569", textAlign: "center", marginTop: 40 },
  userMsg: { alignSelf: "flex-end", background: "#6366f1", color: "#fff", padding: "10px 14px", borderRadius: "12px 12px 2px 12px", maxWidth: "75%", fontSize: 14 },
  botMsg: { alignSelf: "flex-start", background: "#334155", color: "#e2e8f0", padding: "10px 14px", borderRadius: "12px 12px 12px 2px", maxWidth: "75%", fontSize: 14 },
  sysMsg: { alignSelf: "center", background: "#1a3a2a", color: "#4ade80", padding: "8px 14px", borderRadius: 8, fontSize: 13 },
  inputRow: { display: "flex", gap: 8, padding: "12px 24px", borderTop: "1px solid #334155" },
  input: { flex: 1, background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", fontSize: 14, resize: "none", outline: "none" },
  sendBtn: { background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "0 20px", cursor: "pointer", fontWeight: "bold", fontSize: 14 },
};