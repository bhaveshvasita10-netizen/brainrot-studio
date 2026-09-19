const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function openAIRequest(path: string, init: RequestInit) {
  if (!OPENAI_API_KEY) throw new Error('OpenAI provider is not configured. Add OPENAI_API_KEY in Vercel.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${OPENAI_API_KEY}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${OPENAI_BASE_URL}${path}`, { ...init, headers, cache: 'no-store' });
  const text = await response.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.error ? JSON.stringify(data.error) : `AI request failed (${response.status})`);
  return data;
}

export async function geminiRequest(body: { system: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> }) {
  if (!GEMINI_API_KEY) throw new Error('Gemini provider is not configured. Add GEMINI_API_KEY in Vercel.');
  const model = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
  const contents = body.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: body.system }] },
        contents,
        generationConfig: { maxOutputTokens: 500, temperature: 0.85 },
      }),
      cache: 'no-store',
    },
  );
  const text = await response.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.error ? JSON.stringify(data.error) : `Gemini request failed (${response.status})`);
  return data;
}

export function extractText(data: any) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const parts: string[] = [];
  for (const item of data?.output || []) for (const part of item?.content || []) if (typeof part?.text === 'string') parts.push(part.text);
  for (const candidate of data?.candidates || []) for (const part of candidate?.content?.parts || []) if (typeof part?.text === 'string') parts.push(part.text);
  return parts.join('\n') || data?.choices?.[0]?.message?.content || '';
}
