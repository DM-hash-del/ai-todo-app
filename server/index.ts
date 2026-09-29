import OpenAI from "openai";
import { createApp } from "./app.ts";

const openai = new OpenAI(); // reads OPENAI_API_KEY from the environment

createApp(openai).listen(3001, () => console.log("API on http://localhost:3001"));
