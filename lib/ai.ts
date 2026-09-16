const BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const API_KEY = process.env.OPENAI_API_KEY;

export async function openAIRequest(path: string, init: RequestInit) {
  if (!API_KEY) throw new Error('AI provider is not configured. Add OPENAI_API_KEY in Vercel.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${API_KEY}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers, cache: 'no-store' });
  const text = await response.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.error ? JSON.stringify(data.error) : `AI request failed (${response.status})`);
  return data;
}

export function extractText(data: any) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const parts: string[] = [];
  for (const item of data?.output || []) for (const part of item?.content || []) if (typeof part?.text === 'string') parts.push(part.text);
  return parts.join('\n') || data?.choices?.[0]?.message?.content || '';
}
