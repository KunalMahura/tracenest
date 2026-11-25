// Type definitions for @tracenest/sdk
/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from 'http';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TraceNestOptions {
  /** Project API key (tn_...). Defaults to process.env.TRACENEST_API_KEY. */
  apiKey?: string;
  /** Base URL of the TraceNest API. Defaults to process.env.TRACENEST_HOST, then http://localhost:3000. */
  host?: string;
  /** Informational only — the API key already identifies the project. Defaults to TRACENEST_PROJECT_ID. */
  projectId?: string;
  /** Added to every log as meta.service. Defaults to TRACENEST_SERVICE. */
  service?: string;
  /** Added to every log as meta.environment. Defaults to NODE_ENV. */
  environment?: string;
  /** Milliseconds between automatic flushes. Default 5000. */
  flushInterval?: number;
  /** @deprecated Use flushInterval. */
  flushEvery?: number;
  /** Flush early once this many logs are buffered (max 1000). Default 50. */
  batchSize?: number;
  /** Maximum logs held in memory; the oldest are dropped beyond this. Default 10000. */
  maxBufferSize?: number;
  /** HTTP request timeout in milliseconds. Default 5000. */
  timeout?: number;
  /** Print SDK diagnostics to stderr. Default false. */
  debug?: boolean;
  /** Set false to turn the SDK into a no-op (e.g. in tests). Default true. */
  enabled?: boolean;
  /** Request paths that are never recorded. Default ['/health', '/healthz', '/favicon.ico']. */
  ignorePaths?: string[];
  /** Called when a batch fails to send. */
  onError?: (err: TraceNestError) => void;
}

export interface TraceNestError extends Error {
  /** HTTP status from the API, if it responded. */
  statusCode?: number;
  /** true → the batch was kept and will be retried; false → it was dropped. */
  retryable?: boolean;
}

/** A structured event. Only `message` is required. */
export interface LogEvent {
  message: string;
  level?: LogLevel;
  /** HTTP method, e.g. "GET". */
  method?: string;
  /** Route or operation name, e.g. "/users/:id" or "job:send-emails". */
  endpoint?: string;
  statusCode?: number;
  durationMs?: number;
  stack?: string;
  /** Defaults to now. */
  timestamp?: Date | string | number;
  /** Any extra JSON-serialisable data. */
  meta?: Record<string, unknown>;
}

export interface QuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  /** ISO timestamp of the next UTC-midnight reset. */
  resetsAt: string;
}

export interface ClientStats {
  buffered: number;
  dropped: number;
  quota: QuotaStatus | null;
}

/** Minimal shape shared by Express/Connect request handlers. */
export type NextFunction = (err?: unknown) => void;
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: NextFunction) => void;
export type ErrorMiddleware = (err: unknown, req: IncomingMessage, res: ServerResponse, next: NextFunction) => void;
export type RequestHandler<Req extends IncomingMessage = IncomingMessage, Res extends ServerResponse = ServerResponse> =
  (req: Req, res: Res) => unknown;

export class TraceNestClient {
  constructor(opts?: TraceNestOptions);

  /** Record any structured event. */
  capture(event: LogEvent): void;
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  /** Record an error (with stack trace) at level "error". */
  captureException(err: unknown, meta?: Record<string, unknown>): void;

  /** Time one request/response pair; records it when the response finishes. Works with any node:http-based server. */
  trackRequest(req: IncomingMessage, res: ServerResponse): void;
  /** Wrap a plain node:http handler: http.createServer(client.wrap(handler)). */
  wrap<Req extends IncomingMessage, Res extends ServerResponse>(handler: RequestHandler<Req, Res>): RequestHandler<Req, Res>;
  /** Express/Connect middleware that records every request. */
  middleware(): Middleware;
  /** Express error middleware: records the error, then calls next(err). Register after your routes. */
  errorHandler(): ErrorMiddleware;

  /** Send buffered logs now. Never rejects. */
  flush(): Promise<void>;
  /** Stop the timer and send everything still buffered. */
  shutdown(): Promise<void>;
  stats(): ClientStats;
}

/** Express/Connect middleware with the underlying client attached. */
export interface TraceNestMiddleware extends Middleware {
  client: TraceNestClient;
}

/** Express/Connect middleware factory: app.use(tracenest({ apiKey, host })). */
export function tracenest(opts?: TraceNestOptions | TraceNestClient): TraceNestMiddleware;
/** Create a standalone client. */
export function createClient(opts?: TraceNestOptions): TraceNestClient;
/** Initialise the shared default client used by the top-level helpers below. */
export function init(opts?: TraceNestOptions): TraceNestClient;
/** The client created by init(), or null. */
export function getClient(): TraceNestClient | null;

export const SDK_VERSION: string;

// Top-level helpers — require init() first.
export function capture(event: LogEvent): void;
export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
export function debug(message: string, meta?: Record<string, unknown>): void;
export function info(message: string, meta?: Record<string, unknown>): void;
export function warn(message: string, meta?: Record<string, unknown>): void;
export function error(message: string, meta?: Record<string, unknown>): void;
export function captureException(err: unknown, meta?: Record<string, unknown>): void;
export function flush(): Promise<void>;
export function shutdown(): Promise<void>;
