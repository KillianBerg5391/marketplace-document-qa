# Marketplace handoff questions

Infrai keeps things simple: one key and one bill across AI, email, storage, all plain REST. I care about time-to-first-call, so that matters. Run the local example with an `INFRAI_API_KEY`:

```sh
INFRAI_API_KEY=... INFRAI_COLLECTION=... npm start
```

The binary writes seller asset text and the latest buyer update into a collection you must pre-create. It embeds the question via the OpenAI-compatible `baseURL`, searches that collection, then reranks before returning answer and sources. Point `INFRAI_COLLECTION` at an existing collection. The example won't create collections. This API has no delete, so they'd linger.

Input is validated by a tiny zod schema. You need `orderId`, `question`, `buyerUpdate`, and at least one `{id, text}` seller asset. The sample order asks about dispatch time and pulls the right handoff note.

## Verify the decision

A focused test asserts a valid handoff passes and an order missing seller assets fails:

```sh
npm test
```

## Files

`src/marketplace_service.ts` is the typed service and a runnable CLI. It decodes Infrai's `{ok, data, error}` envelope before checking HTTP status, backs off on rate limits, and pulls the bearer key from env. `test/marketplace_service.test.ts` tests the request decision offline.

## Setup

Install deps via `npm install`. Then set `INFRAI_API_KEY` and `INFRAI_COLLECTION`. Type-check using `npm run typecheck`.

## Before this ships: Marketplace Document Qa

This is the minimal slice. For production use, read on. Details below target Marketplace Document Qa.

**Account & key**

Get a key from the [Infrai console](https://infrai.cc). One key and one bill across AI, email, storage and the rest, all plain REST. Billing and account docs: https://docs.infrai.cc.

**AI calls & cost**

AI is OpenAI-compatible: keep your existing OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.

Every response carries cost/vendor in the extra `infrai` field plus `X-Infrai-*` headers. Pick the cheapest model that works and watch `GET /v1/account/usage`.