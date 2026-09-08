import { useEffect, useState } from "react";

const API_BASE = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && path !== "/admin/auth/login") {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json();
}

type SessionResp = {
  user: { id: string; email: string; name: string };
  session: { token: string; expiresAt: number };
};

export async function adminLogin(email: string, password: string) {
  const res = await fetch("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe: true }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || "Login failed");
  }
  return res.json();
}

export async function adminLogout() {
  await fetch("/api/auth/sign-out", { method: "POST" });
}

export async function getSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/get-session", {
      credentials: "include",
    });
    if (res.ok) {
      const data = (await res.json()) as { session?: unknown };
      return !!data.session;
    }
    return false;
  } catch {
    return false;
  }
}

export const api = {
  auth: {
    login: adminLogin,
    logout: adminLogout,
    verify: async () => ({ valid: await getSession() }),
  },

  dashboard: () => request<any>("/admin/dashboard"),

  settings: {
    get: () => request<Record<string, string>>("/admin/settings"),
    update: (settings: Record<string, string>) =>
      request("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      }),
  },

  monitors: {
    list: () => request<any[]>("/admin/monitors"),
    create: (data: any) =>
      request<{ id: string }>("/admin/monitors", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request(`/admin/monitors/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/admin/monitors/${id}`, { method: "DELETE" }),
  },

  components: {
    list: () => request<any[]>("/admin/components"),
    create: (data: any) =>
      request<{ id: string }>("/admin/components", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request(`/admin/components/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/admin/components/${id}`, { method: "DELETE" }),
  },

  groups: {
    list: () => request<any[]>("/admin/groups"),
    create: (data: any) =>
      request<{ id: string }>("/admin/groups", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request(`/admin/groups/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/admin/groups/${id}`, { method: "DELETE" }),
  },

  incidents: {
    list: () => request<any[]>("/admin/incidents"),
    create: (data: any) =>
      request<{ id: string }>("/admin/incidents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request(`/admin/incidents/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/admin/incidents/${id}`, { method: "DELETE" }),
  },

  maintenances: {
    list: () => request<any[]>("/admin/maintenances"),
    create: (data: any) =>
      request<{ id: string }>("/admin/maintenances", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request(`/admin/maintenances/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/admin/maintenances/${id}`, { method: "DELETE" }),
  },

  subscribers: {
    list: () => request<any[]>("/admin/subscribers"),
    create: (data: any) =>
      request<{ id: string }>("/admin/subscribers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/admin/subscribers/${id}`, { method: "DELETE" }),
  },

  notifications: {
    list: () => request<any[]>("/admin/notifications"),
    create: (data: any) =>
      request<{ id: string }>("/admin/notifications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/admin/notifications/${id}`, { method: "DELETE" }),
    test: (id: string) =>
      request(`/admin/notifications/${id}/test`, { method: "POST" }),
  },

  uptime: (monitorId: string, days?: number) =>
    request<any>(`/admin/uptime/${monitorId}?days=${days || 90}`),
};

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSession().then((ok) => {
      if (!mounted) return;
      setIsAuthenticated(ok);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { isAuthenticated, loading };
}
