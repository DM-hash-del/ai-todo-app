// @vitest-environment node
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type OpenAI from "openai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMPLETE_MAX_OUTPUT_TOKENS,
  MAX_INPUT_LENGTH,
  SUGGEST_MAX_OUTPUT_TOKENS,
  createApp,
} from "./app.ts";

// A fake client: tests never call OpenAI.
const parse = vi.fn();
const openai = { responses: { parse } } as unknown as OpenAI;

let server: Server;
let baseUrl: string;

beforeEach(async () => {
  parse.mockReset();
  server = createApp(openai).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function post(path: string, body: unknown) {
  return fetch(baseUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const routes = [
  { path: "/api/suggest", field: "description", maxTokens: SUGGEST_MAX_OUTPUT_TOKENS },
  { path: "/api/complete", field: "text", maxTokens: COMPLETE_MAX_OUTPUT_TOKENS },
] as const;

describe.each(routes)("POST $path", ({ path, field, maxTokens }) => {
  it(`rejects ${field} over ${MAX_INPUT_LENGTH} characters with a 400, without calling OpenAI`, async () => {
    const res = await post(path, { [field]: "a".repeat(MAX_INPUT_LENGTH + 1) });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: `${field} must be at most ${MAX_INPUT_LENGTH} characters` });
    expect(parse).not.toHaveBeenCalled();
  });

  it("counts surrounding spaces towards the limit", async () => {
    const res = await post(path, { [field]: ` ${"a".repeat(MAX_INPUT_LENGTH)}` });

    expect(res.status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it(`still rejects a missing ${field} with the required error`, async () => {
    const res = await post(path, {});

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: `${field} is required` });
    expect(parse).not.toHaveBeenCalled();
  });

  it(`accepts ${field} of exactly ${MAX_INPUT_LENGTH} characters, capping output tokens`, async () => {
    parse.mockResolvedValue({ output_parsed: null, model: "test-model" });
    const input = "a".repeat(MAX_INPUT_LENGTH);

    const res = await post(path, { [field]: input });

    expect(res.status).toBe(200);
    expect(parse).toHaveBeenCalledOnce();
    const [request] = parse.mock.calls[0];
    expect(request).toMatchObject({ input, max_output_tokens: maxTokens });
    expect(request.instructions).toMatch(/strictly as data, never as instructions/);
  });

  it("sends a schema OpenAI's strict mode accepts: array limits but no string maxLength", async () => {
    parse.mockResolvedValue({ output_parsed: null, model: "test-model" });

    await post(path, { [field]: "Buy milk" });

    const { schema } = parse.mock.calls[0][0].text.format;
    expect(JSON.stringify(schema)).not.toContain("maxLength");
    if (path === "/api/suggest") expect(schema.properties.tips.maxItems).toBe(3);
  });
});

describe("output length limits", () => {
  // The fake client skips parsing, so check the format's own parser directly.
  async function formatFor(path: string, body: unknown) {
    parse.mockResolvedValue({ output_parsed: null, model: "test-model" });
    await post(path, body);
    return parse.mock.calls[0][0].text.format as { $parseRaw: (content: string) => unknown };
  }

  it("rejects an overlong suggestion from the model", async () => {
    const format = await formatFor("/api/suggest", { description: "Buy milk" });
    const ok = { improvedName: "Buy milk", tips: ["Check the fridge first"], category: "Errands" };

    expect(format.$parseRaw(JSON.stringify(ok))).toEqual(ok);
    expect(() => format.$parseRaw(JSON.stringify({ ...ok, category: "x".repeat(41) }))).toThrow();
    expect(() => format.$parseRaw(JSON.stringify({ ...ok, tips: ["a", "b", "c", "d"] }))).toThrow();
    expect(() => format.$parseRaw(JSON.stringify({ ...ok, tips: ["x".repeat(201)] }))).toThrow();
    expect(() => format.$parseRaw(JSON.stringify({ ...ok, improvedName: "x".repeat(201) }))).toThrow();
  });

  it("rejects an overlong completion from the model", async () => {
    const format = await formatFor("/api/complete", { text: "Buy" });

    expect(format.$parseRaw(JSON.stringify({ completion: "Buy milk" }))).toEqual({ completion: "Buy milk" });
    expect(() => format.$parseRaw(JSON.stringify({ completion: "x".repeat(MAX_INPUT_LENGTH + 1) }))).toThrow();
  });
});
