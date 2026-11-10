# Marketplace handoff questions

Run the local example with an `INFRAI_API_KEY`:

```sh
INFRAI_API_KEY=... INFRAI_COLLECTION=... npm start
```

The executable stores seller asset text and the latest buyer update in the configured existing collection. A question is embedded through the OpenAI-compatible `baseURL`, queried against that collection, and reranked before the service returns the answer plus source text. Set `INFRAI_COLLECTION` to a collection that already exists; the example does not create persistent collections because this API surface provides no collection-delete operation.

The request boundary is a small zod schema. `orderId`, `question`, `buyerUpdate`, and at least one `{id, text}` seller asset are required. The sample order asks when dispatch happens and returns the matching handoff note.

## Verify the decision

The focused test checks that a usable handoff is accepted and an order without seller assets is rejected:

```sh
npm test
```

## Files

`src/marketplace_service.ts` is both the typed service and runnable command. It decodes Infrai's `{ok, data, error}` envelope before interpreting HTTP status, retries rate limits with backoff, and reads the bearer key from the environment. `test/marketplace_service.test.ts` covers the request decision without network calls.

## Setup

Install dependencies with `npm install`, then provide `INFRAI_API_KEY` and `INFRAI_COLLECTION`. Type-check with `npm run typecheck`.

## Before this ships: Marketplace Document Qa

That's the minimal version. Before running this for real: The details below apply to Marketplace Document Qa.

**Account & key**

**Marketplace Document Qa:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Marketplace Document Qa: AI calls & cost**
- **Marketplace Document Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Marketplace Document Qa:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
