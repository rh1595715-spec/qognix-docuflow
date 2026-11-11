const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const instructions = {
  summary: "Create a clear, well-structured study summary. Use headings, key points, definitions, and a short conclusion. Do not invent facts.",
  quiz: "Create 10 multiple-choice questions based only on the document. Give four options (A-D), mark the correct answer, and briefly explain it. Ensure questions cover different parts.",
  ask: "Answer the user's question using only the supplied document. If the document does not contain the answer, say so clearly.",
  translate: "Translate the supplied document text into the requested language. Preserve headings, meaning, names, and technical terms.",
  chat: "Act as a helpful study tutor. Answer the user's question using the supplied document. Be clear and explain concepts simply. If the answer is not in the document, say so."
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    if (!env.GEMINI_API_KEY) return json({ error: "Server is missing GEMINI_API_KEY secret." }, 500);

    try {
      const body = await request.json();
      const { mode, text, question = "", language = "Urdu" } = body || {};
      if (!instructions[mode]) return json({ error: "Unsupported AI tool." }, 400);
      if (typeof text !== "string" || !text.trim()) return json({ error: "PDF text is required." }, 400);
      if (text.length > 80000) return json({ error: "Document text is too long for this starter version." }, 413);
      if ((mode === "ask" || mode === "chat") && (typeof question !== "string" || !question.trim())) {
        return json({ error: "Please provide a question." }, 400);
      }

      const userTask = mode === "translate"
        ? `Translate the document into ${language}.`
        : (mode === "ask" || mode === "chat") ? `User question: ${question}` : "Process the document.";

      const prompt = `${instructions[mode]}\n\n${userTask}\n\nDOCUMENT TEXT:\n${text}`;
      const model = env.GEMINI_MODEL || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
        })
      });
      const data = await upstream.json();
      if (!upstream.ok) {
        return json({ error: data?.error?.message || "AI provider request failed." }, upstream.status);
      }
      const answer = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n").trim();
      if (!answer) return json({ error: "AI returned an empty response. Try again." }, 502);
      return json({ text: answer }, 200);
    } catch (err) {
      return json({ error: "Request could not be processed. Check your input and try again." }, 400);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}