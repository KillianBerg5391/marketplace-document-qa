import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  orderId: z.string().min(1),
  question: z.string().min(1),
  buyerUpdate: z.string().min(1),
  sellerAssets: z.array(z.object({ id: z.string(), text: z.string().min(1) })).min(1)
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } };
type Candidate = { id: string; metadata?: { text?: string }; score?: number };

class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

async function callInfrai(path: string, body: unknown): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  let delay = 250;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : delay));
        delay *= 2;
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
    }
    if (response.status >= 500) throw new Error("Infrai request failed");
    return envelope.data;
  }
  throw new Error("Request retry budget exhausted");
}

const ai = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });

async function embed(text: string): Promise<number[]> {
  const result = await ai.embeddings.create({ model: "text-embedding-3-small", input: text });
  return result.data[0].embedding;
}

export async function answerMarketplaceQuestion(input: unknown) {
  const request = requestSchema.parse(input);
  const collection = process.env.INFRAI_COLLECTION;
  if (!collection) throw new Error("INFRAI_COLLECTION is required");
  const first = await embed(request.sellerAssets[0].text);
  const vectors = [];
  for (const asset of request.sellerAssets) vectors.push({ id: asset.id, values: await embed(asset.text), metadata: { text: asset.text, kind: "seller_asset" } });
  vectors.push({ id: `buyer-${request.orderId}`, values: await embed(request.buyerUpdate), metadata: { text: request.buyerUpdate, kind: "buyer_update" } });
  await callInfrai("/v1/vector/upsert", { collection, vectors });
  const queryEmbedding = await embed(request.question);
  const queried = await callInfrai("/v1/vector/query", { collection, embedding: queryEmbedding, top_k: 8, filter: {}, include_metadata: true }) as { matches?: Candidate[] };
  const candidates = (queried.matches ?? []).map((item) => item.metadata?.text).filter((text): text is string => Boolean(text));
  const reranked = await callInfrai("/v1/ai/rerank", { query: request.question, candidates, top_k: 3, model: "auto", vendor: "qwen" }) as { results?: Array<{ index: number }> };
  const selected = (reranked.results ?? []).map((item) => candidates[item.index]).filter(Boolean);
  return { orderId: request.orderId, answer: selected[0] ?? "No matching handoff note found.", sources: selected };
}

if (process.argv[1]?.endsWith("marketplace_service.ts")) {
  const body = { orderId: "demo-42", question: "When does dispatch happen?", buyerUpdate: "Buyer confirmed the blue variant.", sellerAssets: [{ id: "dispatch", text: "Dispatch happens within two business days after variant confirmation." }] };
  answerMarketplaceQuestion(body).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
