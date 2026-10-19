// Talks to Supabase (tables and functions are in supabase.sql) and exposes window.Backend.
(() => {
  const { supabaseUrl = "", supabaseKey = "" } = window.SITE || {};
  const BASE = supabaseUrl.replace(/\/+$/, "");
  const STORE = "guestlist.session";
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem(STORE) || "null"); } catch {}

  const fail = (code) => Object.assign(new Error(code), { code });
  const save = (s) => {
    session = s;
    try { s ? sessionStorage.setItem(STORE, JSON.stringify(s)) : sessionStorage.removeItem(STORE); } catch {}
  };

  async function call(path, { method = "GET", body, auth = false, headers = {} } = {}) {
    const h = { apikey: supabaseKey, "Content-Type": "application/json", ...headers };
    if (auth) {
      if (!session) throw fail("signed_out");
      if (session.expires_at * 1000 < Date.now() + 60000) await refresh();
      h.Authorization = `Bearer ${session.access_token}`;
    }
    const res = await fetch(BASE + path, { method, headers: h, body: body && JSON.stringify(body) });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      if (res.status === 401) { save(null); throw fail("signed_out"); }
      throw fail((data && (data.error_code || data.message || data.msg)) || "failed");
    }
    return data;
  }

  async function refresh() {
    const res = await fetch(`${BASE}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!res.ok) { save(null); throw fail("signed_out"); }
    save(await res.json());
  }

  const toGuest = (r) => ({
    token: r.token, name: r.name || "", answer: r.answer || "", count: r.party_size || 0,
    message: r.message || "", repliedAt: r.replied_at || "", createdAt: r.created_at || "",
  });

  window.Backend = {
    ready: !!(BASE && supabaseKey),

    // ---- Guests ----
    async guest(token) {
      const rows = await call("/rest/v1/rpc/get_guest", { method: "POST", body: { p_token: token } });
      return rows && rows[0] ? toGuest(rows[0]) : null;
    },
    rsvp({ token, name, answer, count, message }) {
      return call("/rest/v1/rpc/rsvp", {
        method: "POST",
        body: { p_token: token || "", p_name: name, p_answer: answer, p_party_size: count, p_message: message },
      });
    },

    // ---- Admin ----
    get signedIn() { return !!session; },
    async signIn(email, password) {
      const res = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: supabaseKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw fail(res.status === 400 ? "wrong_password" : "failed");
      save(await res.json());
      if (!(await call("/rest/v1/rpc/is_admin", { method: "POST", body: {}, auth: true }))) {
        save(null);
        throw fail("not_admin");
      }
    },
    signOut() { save(null); },
    async list() {
      return (await call("/rest/v1/guests?select=*&order=created_at.asc", { auth: true })).map(toGuest);
    },
    async invite(name) {
      const rows = await call("/rest/v1/guests", {
        method: "POST", auth: true, body: { name }, headers: { Prefer: "return=representation" },
      });
      return rows[0].token;
    },
    remove(token) {
      return call(`/rest/v1/guests?token=eq.${encodeURIComponent(token)}`, { method: "DELETE", auth: true });
    },
  };
})();
