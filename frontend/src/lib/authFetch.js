export async function authFetch(url, options = {}) {
  const token = localStorage.getItem("devgym_token");
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("devgym_token");
    localStorage.removeItem("devgym_user_id");
    localStorage.removeItem("devgym_email_verified");
    window.location.href = "/login";
  }

  return res;
}
