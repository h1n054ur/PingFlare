import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useStatusPage, useIncidents } from "../hooks/useStatusPage";
import { UptimeBarChart } from "../components/charts/UptimeCharts";
import { classNames } from "../components/ui";

type StatusTone = "green" | "yellow" | "orange" | "red" | "blue" | "gray";

const statusTone: Record<string, StatusTone> = {
  operational: "green",
  degraded_performance: "yellow",
  partial_outage: "orange",
  major_outage: "red",
  under_maintenance: "blue",
  investigating: "blue",
  monitoring: "blue",
  resolved: "green",
};

const statusIcon: Record<string, typeof CheckCircleIcon> = {
  operational: CheckCircleIcon,
  degraded_performance: ExclamationTriangleIcon,
  partial_outage: ExclamationTriangleIcon,
  major_outage: XCircleIcon,
  under_maintenance: ClockIcon,
  investigating: MagnifyingGlassIcon,
  monitoring: EyeIcon,
  resolved: CheckCircleIcon,
};

const badgeTones: Record<StatusTone, string> = {
  green: "bg-green-50 text-green-700 ring-green-600/20",
  yellow: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  gray: "bg-gray-50 text-gray-600 ring-gray-500/20",
};

const bannerTones: Record<StatusTone, string> = {
  green: "bg-green-50 text-green-900 ring-green-600/20",
  yellow: "bg-yellow-50 text-yellow-900 ring-yellow-600/25",
  orange: "bg-orange-50 text-orange-900 ring-orange-600/25",
  red: "bg-red-50 text-red-900 ring-red-600/20",
  blue: "bg-blue-50 text-blue-900 ring-blue-600/20",
  gray: "bg-gray-50 text-gray-900 ring-gray-500/20",
};

const iconTones: Record<StatusTone, string> = {
  green: "text-green-600",
  yellow: "text-yellow-600",
  orange: "text-orange-600",
  red: "text-red-600",
  blue: "text-blue-600",
  gray: "text-gray-500",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusIndicator({ status }: { status: string }) {
  const tone = statusTone[status] || "gray";
  const Icon = statusIcon[status] || CheckCircleIcon;
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        badgeTones[tone]
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ComponentGroup({
  groupName,
  components,
}: {
  groupName: string | null;
  components: any[];
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-gray-900/5">
      {groupName && (
        <h3 className="text-sm/6 font-semibold text-gray-900">{groupName}</h3>
      )}
      <div className={classNames(groupName && "mt-3", "space-y-3 divide-y divide-gray-100")}>
        {components.map((comp, i) => (
          <div key={comp.id} className={classNames(i > 0 && "pt-3")}>
            <ComponentRow component={comp} indent={!!groupName} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ComponentRow({ component, indent }: { component: any; indent: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [uptimeData, setUptimeData] = useState<{
    stats: { uptime_percent: number; avg_response_time: number };
    bars: Array<{ date: string; color: string; uptime: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const monitorId = component.monitor_id;

  useEffect(() => {
    if (open && monitorId) {
      setLoading(true);
      fetch(`/api/admin/uptime/${monitorId}?days=90`)
        .then((r) => r.json())
        .then((d) => {
          setUptimeData(
            d as {
              stats: { uptime_percent: number; avg_response_time: number };
              bars: Array<{ date: string; color: string; uptime: number }>;
            }
          );
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [open, monitorId]);

  return (
    <div className={indent ? "pl-4 sm:pl-6" : undefined}>
      <div className="flex items-center justify-between gap-x-4">
        <div className="flex items-center gap-x-1">
          <span
            className={classNames(
              "text-sm/6",
              indent ? "text-gray-600" : "font-medium text-gray-900"
            )}
          >
            {component.name}
          </span>
          {monitorId && (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="-m-1.5 rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <span className="sr-only">Toggle uptime details</span>
              <ChevronDownIcon
                aria-hidden="true"
                className={classNames("size-4 transition-transform", open && "rotate-180")}
              />
            </button>
          )}
        </div>
        <StatusIndicator status={component.status} />
      </div>
      {open && uptimeData && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-x-10">
            <div>
              <p className="text-xs/5 text-gray-500">{t("Uptime")}</p>
              <p className="mt-0.5 text-lg font-bold text-gray-900">
                {uptimeData.stats.uptime_percent.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs/5 text-gray-500">{t("Response Time")}</p>
              <p className="mt-0.5 text-lg font-bold text-gray-900">
                {uptimeData.stats.avg_response_time}ms
              </p>
            </div>
          </div>
          <p className="text-sm/6 font-semibold text-gray-900">{t("Past 90 Days")}</p>
          <UptimeBarChart data={uptimeData.bars} />
          {loading && (
            <div className="flex justify-center py-2">
              <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
            </div>
          )}
        </div>
      )}
      {open && !uptimeData && (
        <div className="mt-3 py-2">
          {loading ? (
            <div className="flex justify-center">
              <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
            </div>
          ) : (
            <p className="text-xs/5 text-gray-500">No monitor data</p>
          )}
        </div>
      )}
    </div>
  );
}

function IncidentCard({ incident }: { incident: any }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-gray-900/5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="text-sm/6 font-semibold text-gray-900">{incident.name}</h3>
        <StatusIndicator status={incident.status} />
      </div>
      <p className="mt-2 text-xs/5 text-gray-500">{formatDate(incident.created_at)}</p>
      {incident.component_ids?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1.5">
          {incident.component_ids.map((id: string) => (
            <span
              key={id}
              className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-500/20 ring-inset"
            >
              {id.slice(0, 8)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MaintenanceCard({ maintenance }: { maintenance: any }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-gray-900/5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="text-sm/6 font-semibold text-gray-900">{maintenance.name}</h3>
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20 ring-inset">
          {maintenance.status}
        </span>
      </div>
      {maintenance.description && (
        <p className="mt-2 text-sm/6 text-gray-500">{maintenance.description}</p>
      )}
      <p className="mt-2 text-xs/5 text-gray-500">
        {formatDate(maintenance.scheduled_at)} - {formatDate(maintenance.scheduled_until)}
      </p>
    </div>
  );
}

function SubscribeForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/v2/subscribe.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {}
  };

  if (submitted) {
    return (
      <p className="text-center text-sm/6 font-medium text-green-700">
        {t("Subscribe")} - check your email to verify.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:gap-x-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("Email Address")}
        required
        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
      />
      <button
        type="submit"
        className="mt-3 flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 sm:mt-0 sm:shrink-0"
      >
        {t("Subscribe")}
      </button>
    </form>
  );
}

export default function StatusPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useStatusPage();
  const { pastIncidents } = useIncidents();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="size-10 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm/6 font-medium text-red-600">{error || "Failed to load status"}</p>
      </div>
    );
  }

  const groupedComponents: Record<string, any[]> = {};
  for (const comp of data.components) {
    const group = comp.group_name || "__ungrouped__";
    if (!groupedComponents[group]) groupedComponents[group] = [];
    groupedComponents[group].push(comp);
  }

  const overallTone = statusTone[data.status.status] || "gray";
  const OverallIcon = statusIcon[data.status.status] || CheckCircleIcon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex items-center gap-x-3">
          <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
            <rect x="2" y="2" width="28" height="28" rx="8" className="fill-indigo-500" />
            <path
              d="M7 16.5h5l2-5 4 10 2-5h5"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xl font-semibold tracking-tight text-gray-900">
            {data.page.name}
          </span>
        </header>

        <section
          className={classNames(
            "mt-8 flex items-center justify-between gap-x-6 rounded-2xl px-6 py-8 ring-1 ring-inset sm:px-10 sm:py-10",
            bannerTones[overallTone]
          )}
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t(data.status.description)}
            </h1>
            <p className="mt-2 text-sm/6 opacity-75">
              {t("Last updated")}: {formatDate(data.page.updated_at)}
            </p>
          </div>
          <OverallIcon
            aria-hidden="true"
            className={classNames("size-12 shrink-0 sm:size-16", iconTones[overallTone])}
          />
        </section>

        <div className="mt-10 space-y-10">
          {data.incidents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900">{t("Active Incidents")}</h2>
              <div className="mt-4 space-y-4">
                {data.incidents.map((inc) => (
                  <IncidentCard key={inc.id} incident={inc} />
                ))}
              </div>
            </section>
          )}

          {data.scheduled_maintenances.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900">{t("Scheduled Maintenance")}</h2>
              <div className="mt-4 space-y-4">
                {data.scheduled_maintenances.map((m) => (
                  <MaintenanceCard key={m.id} maintenance={m} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-gray-900">{t("Components")}</h2>
            <div className="mt-4 space-y-4">
              {Object.entries(groupedComponents).map(([group, comps]) => (
                <ComponentGroup
                  key={group}
                  groupName={group === "__ungrouped__" ? null : group}
                  components={comps}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-gray-900/5">
            <h2 className="text-lg font-semibold text-gray-900">{t("Subscribe to Updates")}</h2>
            <div className="mt-4">
              <SubscribeForm />
            </div>
          </section>

          {pastIncidents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900">{t("Past Incidents")}</h2>
              <div className="mt-4 space-y-4">
                {pastIncidents.slice(0, 20).map((inc: any) => (
                  <IncidentCard key={inc.id} incident={inc} />
                ))}
              </div>
            </section>
          )}

          <p className="pt-4 text-center text-sm/6 text-gray-500">
            Powered by{" "}
            <a href="/admin/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              PingFlare
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
