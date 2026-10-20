const API_VERSION = "2022-11-28";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_BODY_BYTES = 32_000;
const ALLOWED_ICONS = new Set(["behance", "github", "linkedin", "mail", "link", "palette"]);

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
  });
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function createSession(password, env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ sub: "admin", iat: now, exp: now + SESSION_TTL_SECONDS })));
  const signature = base64UrlEncode(await hmac(env.SESSION_SECRET, payload));
  return `${payload}.${signature}`;
}

async function verifySession(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token.length > 2048 || !token.includes(".")) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = base64UrlEncode(await hmac(env.SESSION_SECRET, payload));
  if (!constantTimeEqual(signature, expected)) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    return data.sub === "admin" && Number.isInteger(data.exp) && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  return origin && origin === env.SITE_ORIGIN;
}

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.SITE_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}

async function readBody(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY_BYTES) throw new Error("Ukuran permintaan terlalu besar.");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new Error("Ukuran permintaan terlalu besar.");
  try { return text ? JSON.parse(text) : {}; } catch { throw new Error("Format JSON tidak valid."); }
}

function normalizeLink(input, existingId = null) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Data tautan tidak valid.");
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const url = typeof input.url === "string" ? input.url.trim() : "";
  const icon = typeof input.icon === "string" ? input.icon.trim() : "link";
  if (!title || title.length > 100) throw new Error("Nama tautan wajib diisi dan maksimal 100 karakter.");
  if (description.length > 250) throw new Error("Deskripsi maksimal 250 karakter.");
  if (category.length > 50) throw new Error("Kategori maksimal 50 karakter.");
  if (!ALLOWED_ICONS.has(icon)) throw new Error("Ikon tidak didukung.");
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("URL tidak valid."); }
  if (!["https:", "http:", "mailto:"].includes(parsed.protocol)) throw new Error("Protokol URL tidak diperbolehkan.");
  if (["http:", "https:"].includes(parsed.protocol) && !parsed.hostname) throw new Error("URL harus memiliki domain.");
  const order = Number(input.order);
  return {
    id: existingId || (typeof input.id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(input.id) ? input.id : crypto.randomUUID()),
    title,
    description,
    url: parsed.href,
    icon,
    category,
    featured: input.featured === true,
    active: input.active !== false,
    order: Number.isSafeInteger(order) && order >= 0 ? order : 0,
  };
}

async function githubRequest(path, env, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "BioLink-Fayz-Worker",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* GitHub returned non-JSON */ }
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub API gagal (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function repoPath(env) {
  const owner = encodeURIComponent(env.GITHUB_OWNER);
  const repo = encodeURIComponent(env.GITHUB_REPO);
  const path = env.GITHUB_FILE_PATH.split("/").map(encodeURIComponent).join("/");
  return `/repos/${owner}/${repo}/contents/${path}`;
}

async function readLinksFile(env) {
  const branch = encodeURIComponent(env.GITHUB_BRANCH || "main");
  const file = await githubRequest(`${repoPath(env)}?ref=${branch}`, env);
  if (!file || !file.content || !file.sha) throw new Error("File JSON tidak ditemukan atau tidak valid.");
  const raw = atob(file.content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || data.version !== 1 || !Array.isArray(data.links)) throw new Error("Struktur links.json tidak sesuai.");
  return { data, sha: file.sha };
}

async function writeLinksFile(data, sha, message, env) {
  const content = base64UrlSafeUtf8(JSON.stringify({ version: 1, links: data.links }, null, 2) + "\n");
  const branch = env.GITHUB_BRANCH || "main";
  return githubRequest(repoPath(env), env, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, content, sha, branch }),
  });
}

function base64UrlSafeUtf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function saveLinks(data, sha, message, env) {
  try {
    await writeLinksFile(data, sha, message, env);
  } catch (error) {
    if (error.status === 409 || error.status === 422) {
      return json({ error: "Data GitHub berubah bersamaan. Muat ulang data lalu ulangi tindakan." }, 409);
    }
    throw error;
  }
  return null;
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  if (method === "GET" && path === "/api/health") return json({ ok: true, service: "BioLink Fayz API" });

  if (method === "POST" && path === "/api/login") {
    const body = await readBody(request);
    if (typeof body.password !== "string" || !body.password || body.password.length > 1024) return json({ error: "Kredensial tidak valid." }, 400);
    if (!constantTimeEqual(body.password, env.ADMIN_PASSWORD)) return json({ error: "Kata sandi salah." }, 401);
    const token = await createSession(body.password, env);
    return json({ token, expiresIn: SESSION_TTL_SECONDS });
  }

  if (method === "POST" && path === "/api/logout") return json({ ok: true });

  if (path.startsWith("/api/admin/") && !(await verifySession(request, env))) return json({ error: "Sesi admin tidak valid atau telah kedaluwarsa." }, 401);

  if (method === "GET" && path === "/api/admin/session") return json({ authenticated: true });

  if (method === "GET" && path === "/api/links") {
    const { data } = await readLinksFile(env);
    return json({ links: data.links.filter((link) => link.active === true).sort((a, b) => a.order - b.order) });
  }

  if (method === "GET" && path === "/api/admin/links") {
    const { data } = await readLinksFile(env);
    return json({ links: data.links.sort((a, b) => a.order - b.order) });
  }

  if (method === "POST" && path === "/api/admin/links") {
    const body = await readBody(request);
    const { data, sha } = await readLinksFile(env);
    const nextOrder = data.links.length ? Math.max(...data.links.map((item) => Number(item.order) || 0)) + 1 : 1;
    const link = normalizeLink({ ...body, order: body.order ?? nextOrder });
    if (data.links.some((item) => item.id === link.id)) return json({ error: "ID tautan sudah digunakan." }, 409);
    data.links.push(link);
    const conflict = await saveLinks(data, sha, `BioLink: tambah tautan ${link.title}`, env);
    return conflict || json({ result: link }, 201);
  }

  const linkMatch = path.match(/^\/api\/admin\/links\/([a-zA-Z0-9_-]{1,100})$/);
  if (linkMatch && method === "PUT") {
    const id = linkMatch[1];
    const body = await readBody(request);
    const { data, sha } = await readLinksFile(env);
    const index = data.links.findIndex((item) => item.id === id);
    if (index < 0) return json({ error: "Tautan tidak ditemukan." }, 404);
    const link = normalizeLink({ ...data.links[index], ...body, id }, id);
    data.links[index] = link;
    const conflict = await saveLinks(data, sha, `BioLink: perbarui tautan ${link.title}`, env);
    return conflict || json({ result: link });
  }

  if (linkMatch && method === "DELETE") {
    const id = linkMatch[1];
    const { data, sha } = await readLinksFile(env);
    const before = data.links.length;
    data.links = data.links.filter((item) => item.id !== id);
    if (data.links.length === before) return json({ error: "Tautan tidak ditemukan." }, 404);
    data.links.sort((a, b) => a.order - b.order).forEach((item, index) => { item.order = index + 1; });
    const conflict = await saveLinks(data, sha, `BioLink: hapus tautan ${id}`, env);
    return conflict || json({ ok: true });
  }

  if (method === "POST" && path === "/api/admin/reorder") {
    const body = await readBody(request);
    if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string") || new Set(body.ids).size !== body.ids.length) return json({ error: "Daftar urutan tidak valid." }, 400);
    const { data, sha } = await readLinksFile(env);
    const knownIds = new Set(data.links.map((item) => item.id));
    if (body.ids.length !== data.links.length || body.ids.some((id) => !knownIds.has(id))) return json({ error: "Daftar ID harus memuat semua tautan tepat satu kali." }, 400);
    const byId = new Map(data.links.map((item) => [item.id, item]));
    data.links = body.ids.map((id, index) => ({ ...byId.get(id), order: index + 1 }));
    const conflict = await saveLinks(data, sha, "BioLink: atur ulang urutan tautan", env);
    return conflict || json({ links: data.links });
  }

  return json({ error: "Endpoint tidak ditemukan." }, 404);
}

export default {
  async fetch(request, env) {
    if (!env.SITE_ORIGIN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_FILE_PATH || !env.GITHUB_TOKEN || !env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
      return json({ error: "Konfigurasi Worker belum lengkap." }, 500);
    }
    const origin = request.headers.get("Origin");
    if (origin && origin !== env.SITE_ORIGIN) return json({ error: "Origin tidak diizinkan." }, 403);
    if (request.method === "OPTIONS") {
      if (!origin || origin !== env.SITE_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    let response;
    try {
      response = await handle(request, env);
    } catch (error) {
      console.error("[BioLink API]", error);
      const status = error.status === 404 ? 404 : 500;
      response = json({ error: status === 404 ? "File data tidak ditemukan." : "Permintaan gagal diproses. Periksa konfigurasi Worker atau GitHub API." }, status);
    }
    const headers = new Headers(response.headers);
    if (origin === env.SITE_ORIGIN) for (const [key, value] of Object.entries(corsHeaders(env))) headers.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

