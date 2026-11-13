import { createHmac, randomUUID } from "node:crypto";
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MAX_BODY_BYTES = 65536;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

export function signOpenBotWebhook({ secret, timestampSeconds, deliveryId, rawBody }) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error("Signing secret must be a non-empty string");
  }
  return (
    "sha256=" +
    createHmac("sha256", secret)
      .update(`${timestampSeconds}.${deliveryId}.${rawBody}`)
      .digest("hex")
  );
}

export function buildOpenBotWebhookRequest({
  secret,
  eventType = "ui.action",
  data = {},
  deliveryId,
  timestampSeconds,
  occurredAt,
}) {
  const ts = timestampSeconds ?? Math.floor(Date.now() / 1000);
  const id = deliveryId ?? `ui-${randomUUID()}`;
  const iso = occurredAt ?? new Date().toISOString();
  const rawBody = JSON.stringify({
    type: eventType,
    occurredAt: iso,
    data,
  });
  const signature = signOpenBotWebhook({
    secret,
    timestampSeconds: ts,
    deliveryId: id,
    rawBody,
  });
  return {
    rawBody,
    headers: {
      "Content-Type": "application/json",
      "X-OpenBot-Timestamp": String(ts),
      "X-OpenBot-Delivery-Id": id,
      "X-OpenBot-Signature": signature,
    },
    deliveryId: id,
    timestampSeconds: ts,
    occurredAt: iso,
  };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(body);
}

function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    req.on("data", (chunk) => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        settled = true;
        chunks.length = 0;
        const err = new Error("Payload too large");
        err.statusCode = 413;
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (settled) return;
      settled = true;
      const text = Buffer.concat(chunks).toString("utf8");
      if (text.trim() === "") {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        const err = new Error("Invalid JSON body");
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      err.statusCode = err.statusCode ?? 400;
      reject(err);
    });
  });
}

function resolveStaticFile(uiDir, rawPathname) {
  if (!uiDir) {
    return { status: 404 };
  }
  if (rawPathname.includes("\0")) {
    return { status: 400 };
  }
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPathname);
  } catch {
    return { status: 400 };
  }
  if (
    decodedPath.includes("\0") ||
    decodedPath.includes("\\") ||
    rawPathname.split(/[\\/]/).includes("..") ||
    decodedPath.split(/[\\/]/).includes("..")
  ) {
    return { status: 403 };
  }

  const resolvedUiDir = path.resolve(uiDir);
  const indexHtmlPath = path.join(resolvedUiDir, "index.html");
  const relativePart = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const targetPath = path.resolve(resolvedUiDir, relativePart);

  if (
    targetPath !== indexHtmlPath &&
    !targetPath.startsWith(resolvedUiDir + path.sep)
  ) {
    return { status: 403 };
  }

  if (!existsSync(targetPath)) {
    return { status: 404 };
  }

  const stat = lstatSync(targetPath);
  if (stat.isSymbolicLink()) {
    const realTarget = realpathSync(targetPath);
    const realRoot = realpathSync(resolvedUiDir);
    if (realTarget !== realRoot && !realTarget.startsWith(realRoot + path.sep)) {
      return { status: 403 };
    }
  }
  if (!stat.isFile()) {
    return { status: 404 };
  }

  return { status: 200, filePath: targetPath };
}

export function createRelayServer({
  webhookUrl,
  secret,
  secretFile,
  eventType = "ui.action",
  uiDir,
  fallbackLogPath,
  timeoutMs = 8000,
} = {}) {
  return http.createServer(async (req, res) => {
    const method = (req.method || "GET").toUpperCase();
    const rawUrl = req.url || "/";
    const qIdx = rawUrl.indexOf("?");
    const rawPathname = qIdx === -1 ? rawUrl : rawUrl.slice(0, qIdx);

    if (method === "GET" && rawPathname === "/healthz") {
      return sendJson(res, 200, { ok: true });
    }

    if (method === "POST" && rawPathname === "/api/wake") {
      let data;
      try {
        data = await readJsonBody(req, MAX_BODY_BYTES);
      } catch (err) {
        const code = err?.statusCode === 413 ? 413 : 400;
        return sendJson(
          res,
          code,
          { ok: false, error: err?.message || "Invalid request" },
          code === 413 ? { Connection: "close" } : {}
        );
      }

      if (!webhookUrl) {
        return sendJson(res, 500, { ok: false, error: "Webhook URL is not configured" });
      }

      let resolvedSecret;
      try {
        resolvedSecret =
          typeof secret === "string" && secret.length > 0
            ? secret
            : secretFile
              ? readFileSync(secretFile, "utf8").trim()
              : "";
      } catch {
        return sendJson(res, 500, { ok: false, error: "Unable to read signing secret" });
      }

      if (!resolvedSecret) {
        return sendJson(res, 500, { ok: false, error: "Signing secret is not configured" });
      }

      const { rawBody, headers, deliveryId, occurredAt } = buildOpenBotWebhookRequest({
        secret: resolvedSecret,
        eventType,
        data,
      });

      let upstreamStatus;
      let upstreamError;
      try {
        const upstream = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body: rawBody,
          signal: AbortSignal.timeout(timeoutMs),
        });
        upstreamStatus = upstream.status;
        if (upstream.status === 200 || upstream.status === 202) {
          return sendJson(res, 200, {
            ok: true,
            status: upstream.status,
            deliveryId,
          });
        }
        upstreamError = `Upstream returned HTTP ${upstream.status}`;
      } catch (err) {
        upstreamError = err instanceof Error ? err.message : "Upstream request failed";
      }

      let logged = false;
      if (fallbackLogPath) {
        mkdirSync(path.dirname(path.resolve(fallbackLogPath)), { recursive: true });
        const line = JSON.stringify({
          deliveryId,
          occurredAt,
          eventType,
          data,
          error: upstreamError,
        });
        appendFileSync(fallbackLogPath, `${line}\n`, "utf8");
        logged = true;
      }

      return sendJson(res, 502, {
        ok: false,
        logged,
        deliveryId,
        status: upstreamStatus ?? 0,
      });
    }

    if (method === "GET" || method === "HEAD") {
      const lookup = resolveStaticFile(uiDir, rawPathname);
      if (lookup.status !== 200) {
        return sendJson(res, lookup.status, {
          ok: false,
          error: lookup.status === 403 ? "Forbidden" : lookup.status === 400 ? "Bad request" : "Not found",
        });
      }
      const ext = path.extname(lookup.filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const fileBytes = readFileSync(lookup.filePath);
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": fileBytes.length,
        "Cache-Control": "no-store",
      });
      res.end(method === "HEAD" ? undefined : fileBytes);
      return;
    }

    return sendJson(res, 404, { ok: false, error: "Not found" });
  });
}

function parseCliArgs(argv) {
  const opts = {
    host: "0.0.0.0",
    port: 8787,
    eventType: "ui.action",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--url":
        opts.webhookUrl = next;
        i += 1;
        break;
      case "--secret-file":
        opts.secretFile = next;
        i += 1;
        break;
      case "--event-type":
        opts.eventType = next;
        i += 1;
        break;
      case "--ui-dir":
        opts.uiDir = next;
        i += 1;
        break;
      case "--port":
        opts.port = Number(next);
        i += 1;
        break;
      case "--host":
        opts.host = next;
        i += 1;
        break;
      case "--fallback-log":
        opts.fallbackLogPath = next;
        i += 1;
        break;
      case "--timeout-ms":
        opts.timeoutMs = Number(next);
        i += 1;
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const opts = parseCliArgs(process.argv.slice(2));
  if (opts.help || !opts.webhookUrl || !opts.secretFile) {
    console.log(
      "Usage: node webhook-relay-server.mjs --url <webhookUrl> --secret-file <path> [--ui-dir <dir>] [--event-type ui.action] [--host 0.0.0.0] [--port 8787] [--fallback-log <jsonl>]"
    );
    process.exit(opts.help ? 0 : 1);
  }
  const server = createRelayServer(opts);
  server.listen(opts.port, opts.host, () => {
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : opts.port;
    console.log(`BeeStack webhook relay listening on http://${opts.host}:${port}`);
  });
}
