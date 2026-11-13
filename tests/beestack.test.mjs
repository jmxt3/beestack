import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateRepository } from "../scripts/validate-beestack.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function listenServer(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const addr = server.address();
      resolve(addr.port);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}

function rawHttpGet(port, rawPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: rawPath,
        method: "GET",
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

test("1. validateRepository passes on the BeeStack repository", () => {
  const result = validateRepository(REPO_ROOT);
  assert.equal(result.ok, true, `Expected validation to pass, errors: ${result.errors.join("; ")}`);
  assert.equal(result.errors.length, 0);
});

test("2. validateRepository rejects negative mutation cases in a temp copy", () => {
  const makeTempCopy = () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "beestack-test-"));
    fs.cpSync(REPO_ROOT, tmpDir, { recursive: true });
    return tmpDir;
  };

  // Case A: profile description > 2000 chars fails
  {
    const tmpDir = makeTempCopy();
    try {
      const profilePath = path.join(tmpDir, "agent", "dr-beebot-profile.json");
      const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
      profile.description = "x".repeat(2001);
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), "utf8");

      const result = validateRepository(tmpDir);
      assert.equal(result.ok, false);
      assert.ok(
        result.errors.some((err) => err.includes("description")),
        `Expected description error, got: ${result.errors.join("; ")}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Case B: missing SKILL.md frontmatter fails
  {
    const tmpDir = makeTempCopy();
    try {
      const skillMdPath = path.join(tmpDir, "skills", "beestack-onboarding", "SKILL.md");
      fs.writeFileSync(skillMdPath, "# Missing frontmatter\n\nJust markdown.\n", "utf8");

      const result = validateRepository(tmpDir);
      assert.equal(result.ok, false);
      assert.ok(
        result.errors.some((err) => err.includes("frontmatter")),
        `Expected frontmatter error, got: ${result.errors.join("; ")}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Case C: broken references/missing.md link fails
  {
    const tmpDir = makeTempCopy();
    try {
      const skillMdPath = path.join(tmpDir, "skills", "beestack-onboarding", "SKILL.md");
      const current = fs.readFileSync(skillMdPath, "utf8");
      fs.writeFileSync(
        skillMdPath,
        `${current}\n\nSee [missing ref](references/missing.md) for details.\n`,
        "utf8"
      );

      const result = validateRepository(tmpDir);
      assert.equal(result.ok, false);
      assert.ok(
        result.errors.some((err) => err.includes("references/missing.md")),
        `Expected broken link error, got: ${result.errors.join("; ")}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test("3. webhook-relay-server serves UI, blocks traversal, signs webhooks, and logs fallback on 503", async () => {
  const { createRelayServer } = await import(
    "../skills/beestack-make-ui/scripts/webhook-relay-server.mjs"
  );

  const secret = "test-signing-secret";
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "beestack-relay-test-"));
  const uiDir = path.join(tmpDir, "ui");
  const fallbackLogPath = path.join(tmpDir, "fallback.jsonl");
  fs.mkdirSync(uiDir, { recursive: true });
  const htmlContent = "<!doctype html><html><body><h1>BeeStack Test UI</h1></body></html>";
  fs.writeFileSync(path.join(uiDir, "index.html"), htmlContent, "utf8");

  let nextMockStatus = 202;
  const receivedRequests = [];

  const mockOpenBot = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      receivedRequests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        rawBody,
      });
      res.writeHead(nextMockStatus, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true, status: nextMockStatus }));
    });
  });

  let relayServer;
  try {
    const mockPort = await listenServer(mockOpenBot);
    const webhookUrl = `http://127.0.0.1:${mockPort}/webhook`;

    relayServer = createRelayServer({
      webhookUrl,
      secret,
      uiDir,
      fallbackLogPath,
    });
    const relayPort = await listenServer(relayServer);
    const baseUrl = `http://127.0.0.1:${relayPort}`;

    // GET /healthz -> 200 { ok: true }
    {
      const res = await fetch(`${baseUrl}/healthz`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(data, { ok: true });
    }

    // GET / -> 200 HTML from index.html
    {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.equal(text, htmlContent);
    }

    // Path traversal checks: /..%2fpackage.json and /../package.json -> 400, 403, or 404
    {
      const encodedTraversal = await rawHttpGet(relayPort, "/..%2fpackage.json");
      assert.ok(
        [400, 403, 404].includes(encodedTraversal.status),
        `Expected 400/403/404 for /..%2fpackage.json, got ${encodedTraversal.status}`
      );

      const rawTraversal = await rawHttpGet(relayPort, "/../package.json");
      assert.ok(
        [400, 403, 404].includes(rawTraversal.status),
        `Expected 400/403/404 for /../package.json, got ${rawTraversal.status}`
      );
    }

    // POST /api/wake -> signed OpenBot webhook -> 200 { ok: true, status: 202 }
    {
      nextMockStatus = 202;
      const res = await fetch(`${baseUrl}/api/wake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping" }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ok, true);
      assert.equal(body.status, 202);

      assert.equal(receivedRequests.length, 1);
      const captured = receivedRequests[0];
      const timestamp = captured.headers["x-openbot-timestamp"];
      const deliveryId = captured.headers["x-openbot-delivery-id"];
      const signature = captured.headers["x-openbot-signature"];

      assert.ok(timestamp, "Missing X-OpenBot-Timestamp header");
      assert.ok(deliveryId, "Missing X-OpenBot-Delivery-Id header");
      assert.ok(signature, "Missing X-OpenBot-Signature header");

      const expectedSig =
        "sha256=" +
        crypto
          .createHmac("sha256", secret)
          .update(`${timestamp}.${deliveryId}.${captured.rawBody}`)
          .digest("hex");
      assert.equal(signature, expectedSig);
    }

    // Mock server returns 503 -> relay returns 502 and logs 1 JSONL line without secret
    {
      nextMockStatus = 503;
      const res = await fetch(`${baseUrl}/api/wake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping-fail" }),
      });
      assert.equal(res.status, 502);
      const body = await res.json();
      assert.equal(body.ok, false);
      assert.equal(body.logged, true);

      assert.equal(fs.existsSync(fallbackLogPath), true);
      const logContent = fs.readFileSync(fallbackLogPath, "utf8");
      assert.equal(logContent.includes(secret), false, "Fallback log must never contain secret");

      const lines = logContent.trim().split(/\r?\n/);
      assert.equal(lines.length, 1);
      const entry = JSON.parse(lines[0]);
      assert.ok(entry.deliveryId);
      assert.ok(entry.occurredAt);
    }
  } finally {
    if (relayServer) {
      await closeServer(relayServer);
    }
    await closeServer(mockOpenBot);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("4. beestack-cli.mjs doctor exits 0 on valid repository", () => {
  const stdout = execFileSync(process.execPath, ["scripts/beestack-cli.mjs", "doctor"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  assert.match(stdout, /BeeStack Doctor/);
  assert.match(stdout, /PASS/);
});
