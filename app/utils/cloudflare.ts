import { env } from "cloudflare:workers";

export type CloudflareEnv = {
  MY_BUCKET: R2Bucket;
  DB: D1Database;
};

export type CloudflareContext = {
  cloudflare?: {
    env?: CloudflareEnv;
    ctx?: {
      waitUntil?: (promise: Promise<unknown>) => void;
    };
  };
  waitUntil?: (promise: Promise<unknown>) => void;
};

type RequestWithContext = Request & { context?: CloudflareContext };

const getRequestContext = (request: Request): CloudflareContext | undefined =>
  (request as RequestWithContext).context;

export const resolveCloudflareEnv = (
  context: unknown,
  request: Request
): CloudflareEnv | undefined => {
  const ctx = context as CloudflareContext | undefined;
  const reqCtx = getRequestContext(request);
  return ctx?.cloudflare?.env ?? reqCtx?.cloudflare?.env ?? env;
};

export const resolveWaitUntil = (
  context: unknown,
  request: Request
): ((promise: Promise<unknown>) => void) | undefined => {
  const ctx = context as CloudflareContext | undefined;
  const reqCtx = getRequestContext(request);
  return (
    ctx?.waitUntil ??
    ctx?.cloudflare?.ctx?.waitUntil ??
    reqCtx?.waitUntil ??
    reqCtx?.cloudflare?.ctx?.waitUntil
  );
};
