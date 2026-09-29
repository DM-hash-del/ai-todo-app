import express from "express";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const Suggestion = z.object({
  improvedName: z.string(),
  tips: z.array(z.string()),
  category: z.string(),
});

const Completion = z.object({
  completion: z.string(),
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
        "You improve to-do items. Suggest a clearer name, 1-3 practical tips, and a short category. " +
        "If the name is already clear, return it unchanged as the improved name.",
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

// Type-ahead for the new-task input: finishes a partially typed task name.
// The client only shows completions that start with what the user typed.
app.post("/api/complete", async (req, res) => {
  const { text } = req.body ?? {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }
  try {
    const response = await openai.responses.parse({
      model: process.env.OPENAI_MODEL!,
      instructions:
        "You autocomplete to-do item names as the user types. Continue the partial text into a short, clear task name. " +
        "Return the whole name: it must start with exactly the text the user typed (same spelling, spacing and case), " +
        "followed by your continuation. Keep it under 60 characters. " +
        "If the text already reads as a complete task name, return it unchanged.",
      input: text,
      text: { format: zodTextFormat(Completion, "completion") },
    });
    // null when the model refused or produced nothing parseable.
    res.json(response.output_parsed);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "AI request failed" });
  }
});

app.listen(3001, () => console.log("API on http://localhost:3001"));
