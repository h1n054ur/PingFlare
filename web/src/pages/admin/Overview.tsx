import { useState, useEffect } from "react";
import {
  CheckIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { api } from "../../lib/api";
import { Badge, Card, PageHeader, StatCard } from "../../components/ui";

export default function AdminOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    );

  if (!data) return <p className="text-sm/6 text-red-600">Failed to load dashboard</p>;

  const monitors = data.monitors || [];
  const components = data.components || [];
  const incidents = data.recentIncidents || [];
  const maintenances = data.upcomingMaintenance || [];

  const upMonitors = monitors.filter((m: any) => m.status === "up").length;
  const downMonitors = monitors.filter((m: any) => m.status === "down").length;
  const totalMonitors = monitors.length;

  const statusColor = (s: string) => {
    if (s === "operational") return "green";
    if (s === "degraded_performance") return "yellow";
    if (s === "partial_outage") return "yellow";
    if (s === "major_outage") return "red";
    if (s === "under_maintenance") return "blue";
    return "gray";
  };

  const ringCircumference = 2 * Math.PI * 34;
  const upRatio = totalMonitors > 0 ? upMonitors / totalMonitors : 1;

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        <StatCard name="Monitors" value={totalMonitors} icon={<SignalIcon className="size-6" />} />
        <StatCard
          name="Up"
          value={<span className="text-green-600">{upMonitors}</span>}
          icon={<CheckIcon className="size-6" />}
          tone="success"
        />
        <StatCard
          name="Down"
          value={<span className="text-red-600">{downMonitors}</span>}
          icon={<ExclamationTriangleIcon className="size-6" />}
          tone="danger"
        />
        <StatCard
          name="Active Incidents"
          value={incidents.length}
          icon={<ExclamationTriangleIcon className="size-6" />}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900">Overall Status</h2>
          <div className="mt-4 flex items-center gap-x-6">
            <div className="relative size-20 shrink-0">
              <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  strokeWidth="8"
                  className="stroke-gray-200"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={downMonitors > 0 ? "stroke-red-500" : "stroke-green-500"}
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringCircumference * (1 - upRatio)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                {totalMonitors > 0 ? `${Math.round(upRatio * 100)}%` : "N/A"}
              </div>
            </div>
            <div>
              <Badge tone={statusColor(data.overallStatus?.status || "operational")}>
                {data.overallStatus?.description || "No Status"}
              </Badge>
              <p className="mt-2 text-sm/6 text-gray-500">
                {upMonitors} of {totalMonitors} monitors up
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-x-2">
            <Squares2X2Icon aria-hidden="true" className="size-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Components</h2>
          </div>
          <div className="mt-4 space-y-2">
            {components.length === 0 && (
              <p className="text-sm/6 text-gray-500">No components configured</p>
            )}
            {components.slice(0, 8).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-x-4">
                <span className="text-sm/6 text-gray-900">{c.name}</span>
                <Badge tone={statusColor(c.status)}>{c.status?.replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {incidents.length > 0 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900">Active Incidents</h2>
          <div className="mt-4 space-y-2">
            {incidents.map((inc: any) => (
              <div key={inc.id} className="flex items-center justify-between gap-x-4">
                <div>
                  <p className="text-sm/6 font-medium text-gray-900">{inc.title}</p>
                  <p className="text-xs/5 text-gray-500">
                    {new Date(inc.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge tone={inc.severity === "major" ? "red" : "yellow"}>{inc.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {maintenances.length > 0 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900">Upcoming Maintenance</h2>
          <div className="mt-4 space-y-2">
            {maintenances.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between gap-x-4">
                <div>
                  <p className="text-sm/6 font-medium text-gray-900">{m.title}</p>
                  <p className="text-xs/5 text-gray-500">
                    {new Date(m.scheduled_start).toLocaleString()} -{" "}
                    {new Date(m.scheduled_end).toLocaleString()}
                  </p>
                </div>
                <Badge tone="blue">{m.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
