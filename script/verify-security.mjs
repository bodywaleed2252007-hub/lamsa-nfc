#!/usr/bin/env node
/**
 * Security parity check. Runs against ANY base URL, so the same script verifies
 * local (`npm run dev`) and production (Vercel).
 *
 *   node script/verify-security.mjs                         # http://localhost:5000, anonymous checks only
 *   BASE_URL=https://lamsa-two.vercel.app node script/verify-security.mjs
 *   ADMIN_USERNAME=... ADMIN_PASSWORD=... node script/verify-security.mjs   # + authz / IDOR checks
 *
 * Note: the rate-limit test deliberately burns the login limiter for your IP (15 min window).
 * Pass SKIP_RATE_LIMIT=1 to skip it. Admin checks create & delete a temporary user.
 */
const BASE = (process.env.BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const { ADMIN_USERNAME, ADMIN_PASSWORD, SKIP_RATE_LIMIT } = process.env;

let pass = 0, failed = 0;
const check = (name, ok, extra = "") => {
  ok ? pass++ : failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `   <-- ${extra}`}`);
};

class Client {
  cookie = "";
  async req(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: { "Content-Type": "application/json", ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) {
      const jar = new Map(this.cookie.split("; ").filter(Boolean).map((c) => c.split(/=(.*)/s).slice(0, 2)));
      for (const c of set) { const [kv] = c.split(";"); const [k, v] = kv.split(/=(.*)/s); jar.set(k, v); }
      this.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    }
    let data = null;
    try { data = await res.clone().json(); } catch {}
    return { status: res.status, data, headers: res.headers };
  }
}

const anon = new Client();

console.log(`\n== Anonymous checks against ${BASE} ==`);
check("GET /api/health reachable", (await anon.req("GET", "/api/health")).status === 200);
check("GET /api/users -> 401", (await anon.req("GET", "/api/users")).status === 401);
check("POST /api/users -> 401", (await anon.req("POST", "/api/users", { username: "x1x1", password: "12345678", isAdmin: true })).status === 401);
check("POST /api/profiles -> 401", (await anon.req("POST", "/api/profiles", { id: "sample", name: "pwn" })).status === 401);
check("PATCH /editable -> 401", (await anon.req("PATCH", "/api/profiles/sample/editable", { isEditable: false })).status === 401);
check("PATCH /direct -> 401", (await anon.req("PATCH", "/api/profiles/sample/direct", { isDirectRedirect: true, directUrl: "https://evil.example" })).status === 401);
check("GET /leads -> 401", (await anon.req("GET", "/api/profiles/sample/leads")).status === 401);
check("GET /api/debug -> 401/403/404", [401, 403, 404].includes((await anon.req("GET", "/api/debug")).status));
check("GET /api/auth/me -> 401", (await anon.req("GET", "/api/auth/me")).status === 401);
const legacy = await anon.req("POST", "/api/auth/login", { username: "admin", password: "admin123" });
check("hardcoded admin/admin123 rejected", legacy.status !== 200, `status ${legacy.status}`);
check("security headers present", anon.req && (await anon.req("GET", "/api/health")).headers.get("x-content-type-options") === "nosniff");

if (ADMIN_USERNAME && ADMIN_PASSWORD) {
  console.log("\n== Admin / IDOR checks ==");
  const admin = new Client();
  const login = await admin.req("POST", "/api/auth/login", { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
  check("admin login ok", login.status === 200, `status ${login.status}`);
  check("login response has no password hash", login.data && !("password" in login.data));

  const list = await admin.req("GET", "/api/users");
  check("admin GET /api/users -> 200, no password field", list.status === 200 && Array.isArray(list.data) && list.data.every((u) => !("password" in u)));

  const uname = `tmp_${Date.now().toString(36)}`;
  const created = await admin.req("POST", "/api/users", { username: uname, password: "TmpPassw0rd!", isAdmin: false });
  check("admin creates normal user", created.status === 200 && created.data?.isAdmin === false, `status ${created.status}`);
  const cardId = `vt${Date.now().toString(36)}`;
  const card = await admin.req("POST", "/api/profiles", { id: cardId, name: "Admin card", links: [] });
  check("admin creates profile", card.status === 200, `status ${card.status}`);

  const user = new Client();
  const ulogin = await user.req("POST", "/api/auth/login", { username: uname, password: "TmpPassw0rd!" });
  check("normal user login ok", ulogin.status === 200);
  check("user GET /api/users -> 403", (await user.req("GET", "/api/users")).status === 403);
  check("user POST /api/users (isAdmin:true) -> 403", (await user.req("POST", "/api/users", { username: `${uname}x`, password: "TmpPassw0rd!", isAdmin: true })).status === 403);
  check("user overwrite admin's profile -> 403", (await user.req("POST", "/api/profiles", { id: cardId, name: "hacked" })).status === 403);
  check("user PATCH /editable on admin card -> 403", (await user.req("PATCH", `/api/profiles/${cardId}/editable`, { isEditable: false })).status === 403);
  check("user PATCH /direct on admin card -> 403", (await user.req("PATCH", `/api/profiles/${cardId}/direct`, { isDirectRedirect: true, directUrl: "https://evil.example" })).status === 403);
  check("user GET leads of admin card -> 403", (await user.req("GET", `/api/profiles/${cardId}/leads`)).status === 403);
  check("user GET /api/debug -> 403/404", [403, 404].includes((await user.req("GET", "/api/debug")).status));
  const me = await user.req("GET", "/api/auth/user");
  check("/api/auth/user has no password hash", me.status === 200 && !("password" in me.data));

  const js = await admin.req("PATCH", `/api/profiles/${cardId}/direct`, { isDirectRedirect: true, directUrl: "javascript:alert(1)" });
  check("javascript: direct URL rejected (400)", js.status === 400, `status ${js.status}`);
  const ok = await admin.req("PATCH", `/api/profiles/${cardId}/direct`, { isDirectRedirect: true, directUrl: "example.com/page" });
  check("https URL accepted & normalised", ok.status === 200 && String(ok.data?.directUrl).startsWith("https://example.com"), `status ${ok.status}`);

  const vc = await fetch(`${BASE}/api/profiles/${cardId}/vcard`);
  check("vcard served", vc.status === 200);

  // cleanup
  await admin.req("PATCH", `/api/profiles/${cardId}/direct`, { isDirectRedirect: false });
  if (created.data?.id) await admin.req("DELETE", `/api/users/${created.data.id}`);
} else {
  console.log("\n(ADMIN_USERNAME/ADMIN_PASSWORD not set: skipping authenticated/IDOR checks)");
}

if (!SKIP_RATE_LIMIT) {
  console.log("\n== Rate limit (login) ==");
  const rl = new Client();
  let first429 = 0;
  for (let i = 1; i <= 14; i++) {
    const r = await rl.req("POST", "/api/auth/login", { username: "nobody", password: "wrong-password" });
    if (r.status === 429) { first429 = i; break; }
  }
  check("login limiter returns 429 (expected ~11th attempt)", first429 > 0 && first429 <= 12, `first 429 at attempt ${first429 || "never"}`);
}

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
