import { Inngest } from "inngest";

export const inngest = new Inngest({
    id: 'trading-signals',
    ai: { gemini: { apiKey: process.env.GEMINI_API_KEY! } },
})