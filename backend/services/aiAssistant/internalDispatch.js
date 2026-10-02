"use strict";

const { EventEmitter } = require("events");
const { Readable } = require("stream");

class InternalResponse extends EventEmitter {
  constructor(onEnd) {
    super();
    this.statusCode = 200;
    this.headersSent = false;
    this.writableEnded = false;
    this.finished = false;
    this._headers = {};
    this._chunks = [];
    this._onEnd = onEnd;
  }

  setHeader(name, value) {
    this._headers[String(name).toLowerCase()] = value;
  }

  getHeader(name) {
    return this._headers[String(name).toLowerCase()];
  }

  getHeaders() {
    return { ...this._headers };
  }

  hasHeader(name) {
    return Object.prototype.hasOwnProperty.call(this._headers, String(name).toLowerCase());
  }

  removeHeader(name) {
    delete this._headers[String(name).toLowerCase()];
  }

  writeHead(statusCode, reasonOrHeaders, maybeHeaders) {
    this.statusCode = Number(statusCode) || 200;
    const headers = reasonOrHeaders && typeof reasonOrHeaders === "object" ? reasonOrHeaders : maybeHeaders;
    if (headers && typeof headers === "object") {
      for (const [key, value] of Object.entries(headers)) this.setHeader(key, value);
    }
    this.headersSent = true;
    return this;
  }

  flushHeaders() {
    this.headersSent = true;
  }

  write(chunk) {
    if (chunk !== undefined && chunk !== null && typeof chunk !== "function") {
      this._chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    this.headersSent = true;
    return true;
  }

  end(chunk) {
    if (this.writableEnded) return this;
    this.write(chunk);
    this.writableEnded = true;
    this.finished = true;
    const text = Buffer.concat(this._chunks).toString("utf8");
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (_) {
      body = null;
    }
    this._onEnd({ status: this.statusCode, body, text, headers: this.getHeaders() });
    this.emit("finish");
    this.emit("close");
    return this;
  }
}

/**
 * Runs an existing API route in-process, as the signed-in user who asked the
 * assistant. The route re-verifies the session token and applies all of its
 * normal authorization, validation, platform gates and notifications, so an AI
 * tool can never do more than the user could do from the regular app.
 */
function createInternalDispatcher({ getHandler, getSessionToken, timeoutMs = 30_000 }) {
  return async function dispatch(baseRequest, { method = "GET", path, query = null, body } = {}) {
    const handler = typeof getHandler === "function" ? getHandler() : null;
    if (typeof handler !== "function") {
      throw Object.assign(new Error("Assistant is not ready yet."), { statusCode: 503 });
    }
    if (!String(path || "").startsWith("/api/")) {
      throw Object.assign(new Error("Internal assistant requests must target /api routes."), { statusCode: 500 });
    }
    const search = query ? new URLSearchParams(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    ).toString() : "";
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const request = Readable.from(payload ? [payload] : []);
    request.method = String(method).toUpperCase();
    request.url = search ? `${path}?${search}` : path;
    request.httpVersion = "1.1";
    request.headers = {
      host: String(baseRequest?.headers?.host || "127.0.0.1"),
      accept: "application/json",
      "user-agent": "switch-ai-assistant/1",
    };
    const forwardedFor = baseRequest?.headers?.["x-forwarded-for"];
    if (forwardedFor) request.headers["x-forwarded-for"] = forwardedFor;
    if (payload) {
      request.headers["content-type"] = "application/json";
      request.headers["content-length"] = String(payload.length);
    }
    const token = getSessionToken(baseRequest);
    if (token) request.headers["x-switch-session"] = token;
    request.socket = { remoteAddress: baseRequest?.socket?.remoteAddress || "127.0.0.1", encrypted: false };
    request.connection = request.socket;
    request.switchAssistantInternal = true;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(Object.assign(new Error("The request took too long. Please try again."), { statusCode: 504 }));
      }, timeoutMs);
      const response = new InternalResponse((result) => {
        clearTimeout(timer);
        resolve(result);
      });
      Promise.resolve()
        .then(() => handler(request, response))
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  };
}

module.exports = { createInternalDispatcher, InternalResponse };
