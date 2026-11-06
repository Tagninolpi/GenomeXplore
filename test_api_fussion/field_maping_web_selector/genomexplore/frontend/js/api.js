async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = "Invalid input";
    } catch (_) { /* body was not JSON */ }
    throw new Error(detail);
  }
  return response.status === 204 ? null : response.json();
}

export function getJSON(url, params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(query ? `${url}?${query}` : url);
}

export function postJSON(url, body) {
  return request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteJSON(url, params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(query ? `${url}?${query}` : url, { method: "DELETE" });
}
