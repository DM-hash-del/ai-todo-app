import express from "express";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const Suggestion = z.object({
  improvedName: z.string(),
  tips: z.array(z.string()),
  category: z.string(),
});

const openai = new OpenAI(); // reads OPENAI_API_KEY from the environment
const app = express();
app.use(express.json());

app.post("/api/suggest", async (req, res) => {
  const { description } = req.body ?? {};
  if (typeof description !== "string" || !description.trim()) {
    return res.status(400).json({ error: "description is required" });
  }
  try {
    const response = await openai.responses.parse({
      model: process.env.OPENAI_MODEL!,
      instructions:
        "You improve to-do items. Suggest a clearer name, 1-3 practical tips, and a short category.",
      input: description,
      text: { format: zodTextFormat(Suggestion, "suggestion") },
    });
    const parsed = response.output_parsed;
    // Tag the suggestion with the model that actually answered (e.g. a dated
    // snapshot of OPENAI_MODEL) so the UI can attribute it. null stays null.
    res.json(parsed && { ...parsed, model: response.model });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "AI request failed" });
  }
});

app.listen(3001, () => console.log("API on http://localhost:3001"));
