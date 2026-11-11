import { useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type Mode = "summary" | "quiz" | "ask" | "translate" | "chat";
const API_URL = import.meta.env.VITE_API_URL || "/api/ai";

export default function App() {
  const [fileName, setFileName] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [question, setQuestion] = useState("");
  const [language, setLanguage] = useState("Urdu");
  const [mode, setMode] = useState<Mode>("summary");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const wordCount = useMemo(() => pdfText.trim() ? pdfText.trim().split(/\s+/).length : 0, [pdfText]);

  async function readPdf(file?: File) {
    if (!file) return;
    setError(""); setResult("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file."); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("For this starter version, PDF size limit is 10 MB."); return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let text = "";
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => "str" in item ? item.str : "").join(" ") + "\n";
      }
      if (!text.trim()) {
        setError("No selectable text found. This may be a scanned PDF; OCR is not included yet."); return;
      }
      setFileName(file.name);
      setPdfText(text.slice(0, 80000));
    } catch {
      setError("Could not read this PDF. Please try another text-based PDF.");
    }
  }

  async function runAI() {
    if (!pdfText) { setError("Upload a PDF first."); return; }
    if ((mode === "ask" || mode === "chat") && !question.trim()) {
      setError("Write your question first."); return;
    }
    setBusy(true); setError(""); setResult("");
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, text: pdfText, question, language })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI request failed.");
      setResult(data.text || "No response returned.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setBusy(false); }
  }

  function downloadText() {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "qognix-docuflow-result.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  const modes: { id: Mode; label: string }[] = [
    { id: "summary", label: "Summarize" }, { id: "quiz", label: "Make MCQs" },
    { id: "ask", label: "Ask PDF" }, { id: "translate", label: "Translate" },
    { id: "chat", label: "AI chat" }
  ];

  return <main className="shell">
    <header className="topbar">
      <div className="brand-mark">Q</div>
      <div><strong>Qognix DocuFlow</strong><small>AI PDF Study Assistant</small></div>
      <span className="top-tag">BETA</span>
    </header>

    <section className="hero">
      <div className="eyebrow">YOUR DOCUMENT. YOUR AI STUDY PARTNER.</div>
      <h1>Understand any PDF<br /><span>in less time.</span></h1>
      <p>Upload a document, create study notes, generate quizzes, and ask questions.</p>
    </section>

    <section className="workspace">
      <div className="panel upload-panel">
        <div className="section-heading"><div><h2>1. Add your PDF</h2><p>Text-based PDF · Maximum 10 MB</p></div><span className="step">01</span></div>
        <label className="dropzone">
          <div className="file-icon">PDF</div>
          <strong>{fileName || "Choose a PDF to get started"}</strong>
          <span>{fileName ? `${wordCount.toLocaleString()} words extracted` : "Tap to browse files on your device"}</span>
          <input type="file" accept="application/pdf,.pdf" onChange={e => readPdf(e.target.files?.[0])} />
        </label>
        {pdfText && <div className="success-line">✓ PDF text extracted and ready for AI</div>}
      </div>

      <div className="panel tools-panel">
        <div className="section-heading"><div><h2>2. What would you like to do?</h2><p>Select an AI tool for your document</p></div><span className="step">02</span></div>
        <div className="mode-grid">
          {modes.map(m => <button key={m.id} className={`mode ${mode === m.id ? "selected" : ""}`} onClick={() => { setMode(m.id); setResult(""); }}>
            <span className="mode-symbol">{({summary:"✦",quiz:"☷",ask:"?",translate:"文",chat:"◌"} as Record<Mode,string>)[m.id]}</span>{m.label}
          </button>)}
        </div>
        {mode === "translate" && <label className="field-label">Translate into
          <select value={language} onChange={e => setLanguage(e.target.value)}>
            {["Urdu","English","Arabic","Spanish","French","German","Chinese","Hindi","Turkish"].map(l => <option key={l}>{l}</option>)}
          </select>
        </label>}
        {(mode === "ask" || mode === "chat") && <label className="field-label">Your question
          <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask something about your PDF..." rows={3} />
        </label>}
        <button className="primary" disabled={busy || !pdfText} onClick={runAI}>
          {busy ? <><span className="spinner" /> Working on your document...</> : "Generate with AI →"}
        </button>
      </div>

      {(error || result) && <div className="panel result-panel">
        <div className="result-head"><div><h2>{error ? "Something needs attention" : "Your result"}</h2><p>{error ? "Please check and try again" : "Generated from your uploaded PDF"}</p></div>
          {result && <button className="download" onClick={downloadText}>↓ Download TXT</button>}
        </div>
        {error ? <div className="error">{error}</div> : <pre className="result-text">{result}</pre>}
      </div>}
    </section>

    <div className="ad-slot"><span>ADVERTISEMENT</span><strong>Ad space</strong><small>Adsterra code can be placed here after publisher approval.</small></div>
    <footer><strong>Qognix DocuFlow</strong><span>PDFs are processed in your browser; extracted text is sent to the AI service when you request a result.</span><span>© {new Date().getFullYear()} Qognix</span></footer>
  </main>;
}