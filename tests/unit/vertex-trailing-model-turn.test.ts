import { test } from "node:test";
import assert from "node:assert/strict";

import { stripTrailingVertexModelTurn } from "../../open-sse/executors/vertex.ts";

/**
 * Regression test for Vertex AI (aiplatform.googleapis.com) rejecting conversations
 * that end with a `model` turn with:
 * `400 INVALID_ARGUMENT: Requests ending with a model turn are not supported.`
 *
 * Parallels Antigravity's trailing-turn strip (#10104) and ensures Vertex AI
 * native Gemini requests always end on a user turn.
 */

test("(a) strips a single trailing model turn from contents", () => {
  const request = {
    contents: [
      { role: "user", parts: [{ text: "Hello" }] },
      { role: "model", parts: [{ text: "Hi there" }] },
    ],
  };

  stripTrailingVertexModelTurn(request);

  assert.equal(request.contents.length, 1);
  assert.equal(request.contents[0].role, "user");
});

test("(b) strips multiple consecutive trailing model turns", () => {
  const request = {
    contents: [
      { role: "user", parts: [{ text: "Hello" }] },
      { role: "model", parts: [{ text: "Turn 1" }] },
      { role: "model", parts: [{ text: "Turn 2" }] },
    ],
  };

  stripTrailingVertexModelTurn(request);

  assert.equal(request.contents.length, 1);
  assert.equal(request.contents[0].role, "user");
});

test("(c) leaves contents ending on user turn untouched", () => {
  const request = {
    contents: [
      { role: "user", parts: [{ text: "Hello" }] },
      { role: "model", parts: [{ text: "Hi" }] },
      { role: "user", parts: [{ text: "How are you?" }] },
    ],
  };

  stripTrailingVertexModelTurn(request);

  assert.equal(request.contents.length, 3);
  assert.equal(request.contents[2].role, "user");
});

test("(d) preserves a lone model turn so contents is never emptied", () => {
  const request = {
    contents: [{ role: "model", parts: [{ text: "Lone prefill" }] }],
  };

  stripTrailingVertexModelTurn(request);

  assert.equal(request.contents.length, 1);
  assert.equal(request.contents[0].role, "model");
});

test("(e) gracefully handles missing or non-array contents", () => {
  const req1: Record<string, unknown> = {};
  stripTrailingVertexModelTurn(req1);
  assert.deepEqual(req1, {});

  const req2: Record<string, unknown> = { contents: null };
  stripTrailingVertexModelTurn(req2);
  assert.equal(req2.contents, null);
});
