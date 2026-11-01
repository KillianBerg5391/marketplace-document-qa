import { z } from "zod";

const handoffSchema = z.object({ orderId: z.string().min(1), question: z.string().min(1), buyerUpdate: z.string().min(1), sellerAssets: z.array(z.object({ id: z.string(), text: z.string().min(1) })).min(1) });
const valid = { orderId: "o-7", question: "dispatch?", buyerUpdate: "blue confirmed", sellerAssets: [{ id: "a", text: "dispatch in two days" }] };
if (!handoffSchema.safeParse(valid).success) throw new Error("valid handoff rejected");
if (handoffSchema.safeParse({ ...valid, sellerAssets: [] }).success) throw new Error("empty asset list accepted");
console.log("handoff request validation passed");
