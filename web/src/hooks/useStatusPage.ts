import { useState, useEffect, useCallback } from "react";

interface StatusData {
  page: { id: string; name: string; url: string; updated_at: string };
  status: { status: string; description: string; indicator: string };
  components: Array<{
    id: string;
    name: string;
    status: string;
    group_id: string | null;
    group_name: string | null;
  }>;
  incidents: Array<{
    id: string;
    name: string;
    status: string;
    severity: string;
    impact: string;
    created_at: string;
    updated_at: string;
    component_ids: string[];
  }>;
  scheduled_maintenances: Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    scheduled_at: string;
    scheduled_until: string;
    component_ids: string[];
  }>;
}

export function useStatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v2/status.json");
      if (!res.ok) throw new Error("Failed to fetch status");
      const json = (await res.json()) as StatusData;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { data, loading, error, refetch: fetchStatus };
}

export function useIncidents() {
  const [pastIncidents, setPastIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v2/incidents.json?limit=50")
      .then((r) => r.json())
      .then((d: any) => {
        setPastIncidents(d?.incidents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { pastIncidents, loading };
}
