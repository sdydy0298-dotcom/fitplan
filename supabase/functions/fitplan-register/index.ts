import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const allowedOrigins = new Set([
  "https://fitplan-sdydy0298-dotcom.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const encoder = new TextEncoder();

function response(origin: string, status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Vary": "Origin",
    },
  });
}

async function hexHash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) {
    return Response.json({ error: "허용되지 않은 접근입니다." }, { status: 403 });
  }
  if (request.method === "OPTIONS") return response(origin, 200, { ok: true });
  if (request.method !== "POST") return response(origin, 405, { error: "허용되지 않은 요청입니다." });

  const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const newSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}";
  const publishedKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}";
  const oldAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  let serverKey = legacyKey;
  let publicKeys: string[] = oldAnonKey ? [oldAnonKey] : [];
  try {
    const candidate = JSON.parse(newSecretKeys);
    if (!serverKey && typeof candidate.default === "string") serverKey = candidate.default;
    const p = JSON.parse(publishedKeys);
    publicKeys = publicKeys.concat(Object.values(p).filter((v): v is string => typeof v === "string"));
  } catch {
    return response(origin, 503, { error: "가입 서비스 설정을 확인할 수 없습니다." });
  }
  if (!projectUrl || !serverKey || publicKeys.length === 0) {
    return response(origin, 503, { error: "가입 서비스 설정이 준비되지 않았습니다." });
  }
  if (!publicKeys.includes(request.headers.get("apikey") ?? "")) {
    return response(origin, 401, { error: "인증되지 않은 앱 요청입니다." });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 2048) return response(origin, 413, { error: "요청이 너무 큽니다." });

  let values: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return response(origin, 413, { error: "요청이 너무 큽니다." });
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error("Invalid payload");
    values = parsed;
  } catch {
    return response(origin, 400, { error: "가입 정보를 확인해 주세요." });
  }

  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const password = typeof values.password === "string" ? values.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response(origin, 400, { error: "올바른 이메일 주소를 입력해 주세요." });
  }
  if (password.length < 8 || password.length > 128) {
    return response(origin, 400, { error: "비밀번호는 8~128자로 입력해 주세요." });
  }

  const client = createClient(projectUrl, serverKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Rate limits are atomic database operations. The database only stores
  // salted SHA-256 keys, never plaintext IP addresses or signup emails.
  const gatewayIp = (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown"
  ).trim().slice(0, 96);
  const salt = serverKey.slice(-32);
  const rules: Array<[string, number, number]> = [
    ["ip:" + gatewayIp, 4, 3600],
    ["email:" + email, 3, 86400],
    ["total:fitplan", 30, 3600],
  ];
  for (const [subject, limit, seconds] of rules) {
    const hashed = await hexHash(salt + "|" + subject);
    const { data, error } = await client.schema("fitplan").rpc("allow_signup_attempt", {
      p_key_hash: hashed,
      p_limit: limit,
      p_window_seconds: seconds,
    });
    if (error) {
      console.error("fitplan_signup_throttle_error", error.code, error.status);
      return response(origin, 503, { error: "가입 요청 제한을 확인할 수 없습니다." });
    }
    if (data !== true) return response(origin, 429, { error: "회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." });
  }

  try {
    // Explicitly confirm only new FITPLAN signups, preserving the shared
    // Supabase project's global Confirm email setting for other ALEPH apps.
    const { error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      if (error.status === 422 || /already|exist|duplicate/i.test(error.message)) {
        return response(origin, 409, { error: "이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요." });
      }
      console.error("fitplan_signup_auth_error", error.code, error.status);
      return response(origin, 503, { error: "회원가입을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }
    return response(origin, 200, { ok: true });
  } catch {
    return response(origin, 503, { error: "회원가입 처리 중 문제가 발생했습니다." });
  }
});
