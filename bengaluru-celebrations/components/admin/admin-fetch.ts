"use client";

export class ApiError extends Error {
  fields?: Record<string, string>;
  status: number;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function adminFetch<T = any>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new ApiError("Signed out", 401);
  }
  if (!res.ok) {
    const fields = data?.error?.fields as Record<string, string> | undefined;
    const msg = fields ? Object.values(fields).join(" ") : data?.error?.message ?? "Request failed.";
    throw new ApiError(msg, res.status, fields);
  }
  return data as T;
}
