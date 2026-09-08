import { useState, useEffect } from "react";
import { Container, Text, Group, Badge, Paper, Stack, SimpleGrid, Anchor, Box, ThemeIcon, Loader, Tooltip, ActionIcon } from "@mantine/core";
import { IconCheck, IconAlertTriangle, IconAlertCircle, IconClock, IconRefresh, IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useStatusPage, useIncidents } from "../hooks/useStatusPage";
import { UptimeBarChart, LatencyLineChart } from "../components/charts/UptimeCharts";

const statusColors: Record<string, string> = {
  operational: "green",
  degraded_performance: "yellow",
  partial_outage: "orange",
  major_outage: "red",
  under_maintenance: "blue",
};

const statusIcons: Record<string, typeof IconCheck> = {
  operational: IconCheck,
  degraded_performance: IconAlertTriangle,
  partial_outage: IconAlertCircle,
  major_outage: IconAlertCircle,
  under_maintenance: IconClock,
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
  const color = statusColors[status] || "gray";
  const Icon = statusIcons[status] || IconCheck;
  return (
    <Badge color={color} variant="light" leftSection={<Icon size={14} />}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function ComponentGroup({
  groupName,
  components,
}: {
  groupName: string | null;
  components: any[];
}) {
  const { t } = useTranslation();

  return (
    <Paper p="md" withBorder>
      {groupName && <Text fw={600} mb="xs">{groupName}</Text>}
      <Stack gap="xs">
        {components.map((comp) => (
          <ComponentRow key={comp.id} component={comp} indent={!!groupName} />
        ))}
      </Stack>
    </Paper>
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
    <Box pl={indent ? "md" : 0}>
      <Group justify="space-between">
        <Group gap="xs">
          {indent && <Text size="sm">{component.name}</Text>}
          {!indent && <Text size="sm" fw={500}>{component.name}</Text>}
          {monitorId && (
            <ActionIcon size="sm" variant="subtle" onClick={() => setOpen(!open)}>
              <IconChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none" }} />
            </ActionIcon>
          )}
        </Group>
        <StatusIndicator status={component.status} />
      </Group>
      {open && uptimeData && (
        <>
          <Stack gap="sm" mt="xs">
            <Group gap="lg">
              <div>
                <Text size="xs" c="dimmed">{t("Uptime")}</Text>
                <Text fw={700} size="lg">
                  {uptimeData.stats.uptime_percent.toFixed(2)}%
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{t("Response Time")}</Text>
                <Text fw={700} size="lg">
                  {uptimeData.stats.avg_response_time}ms
                </Text>
              </div>
            </Group>
            <Text size="sm" fw={600}>{t("Past 90 Days")}</Text>
            <UptimeBarChart data={uptimeData.bars} />
          </Stack>
          {loading && (
            <Box ta="center" py="sm"><Loader size="sm" /></Box>
          )}
        </>
      )}
      {open && !uptimeData && (
        <Box py="sm">
          {loading ? (
            <Box ta="center"><Loader size="sm" /></Box>
          ) : (
            <Text size="xs" c="dimmed">No monitor data</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

function IncidentCard({ incident }: { incident: any }) {
  const { t } = useTranslation();
  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{incident.name}</Text>
        <StatusIndicator status={incident.status} />
      </Group>
      <Text size="sm" c="dimmed">
        {formatDate(incident.created_at)}
      </Text>
      {incident.component_ids?.length > 0 && (
        <Group mt="xs" gap="xs">
          {incident.component_ids.map((id: string) => (
            <Badge key={id} size="sm" variant="outline">{id.slice(0, 8)}</Badge>
          ))}
        </Group>
      )}
    </Paper>
  );
}

function MaintenanceCard({ maintenance }: { maintenance: any }) {
  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{maintenance.name}</Text>
        <Badge color="blue" variant="light">{maintenance.status}</Badge>
      </Group>
      {maintenance.description && (
        <Text size="sm" c="dimmed" mb="xs">{maintenance.description}</Text>
      )}
      <Text size="sm" c="dimmed">
        {formatDate(maintenance.scheduled_at)} - {formatDate(maintenance.scheduled_until)}
      </Text>
    </Paper>
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
      <Text c="green" ta="center">
        {t("Subscribe")} - check your email to verify.
      </Text>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Group>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("Email Address")}
          required
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--mantine-color-gray-4)",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: "var(--mantine-color-blue-6)",
            color: "white",
            cursor: "pointer",
          }}
        >
          {t("Subscribe")}
        </button>
      </Group>
    </form>
  );
}

export default function StatusPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useStatusPage();
  const { pastIncidents } = useIncidents();

  if (loading) {
    return (
      <Container size="md" py="xl" ta="center">
        <Loader size="lg" />
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container size="md" py="xl" ta="center">
        <Text c="red">{error || "Failed to load status"}</Text>
      </Container>
    );
  }

  const groupedComponents: Record<string, any[]> = {};
  for (const comp of data.components) {
    const group = comp.group_name || "__ungrouped__";
    if (!groupedComponents[group]) groupedComponents[group] = [];
    groupedComponents[group].push(comp);
  }

  const statusBg: Record<string, string> = {
    operational: "var(--mantine-color-green-1)",
    degraded_performance: "var(--mantine-color-yellow-1)",
    partial_outage: "var(--mantine-color-orange-1)",
    major_outage: "var(--mantine-color-red-1)",
    under_maintenance: "var(--mantine-color-blue-1)",
  };

  return (
    <Box bg="gray.0" mih="100vh">
      <Paper
        p="xl"
        radius={0}
        style={{ background: statusBg[data.status.status] || "var(--mantine-color-green-1)" }}
      >
        <Container size="md">
          <Group justify="space-between" align="center">
            <Stack gap={0}>
              <Text fw={700} size="xl">
                {t(data.status.description)}
              </Text>
              <Text size="sm" c="dimmed">
                {t("Last updated")}: {formatDate(data.page.updated_at)}
              </Text>
            </Stack>
            <ThemeIcon size="xl" variant="light" color={statusColors[data.status.status] || "green"}>
              {(() => {
                const Icon = statusIcons[data.status.status] || IconCheck;
                return <Icon size={28} />;
              })()}
            </ThemeIcon>
          </Group>
        </Container>
      </Paper>

      <Container size="md" py="xl">
        <Stack gap="xl">
          {/* Unresolved Incidents */}
          {data.incidents.length > 0 && (
            <Box>
              <Text fw={700} size="lg" mb="md">
                {t("Active Incidents")}
              </Text>
              <Stack gap="sm">
                {data.incidents.map((inc) => (
                  <IncidentCard key={inc.id} incident={inc} />
                ))}
              </Stack>
            </Box>
          )}

          {/* Scheduled Maintenance */}
          {data.scheduled_maintenances.length > 0 && (
            <Box>
              <Text fw={700} size="lg" mb="md">
                {t("Scheduled Maintenance")}
              </Text>
              <Stack gap="sm">
                {data.scheduled_maintenances.map((m) => (
                  <MaintenanceCard key={m.id} maintenance={m} />
                ))}
              </Stack>
            </Box>
          )}

          {/* Components */}
          <Box>
            <Text fw={700} size="lg" mb="md">
              {t("Components")}
            </Text>
            <Stack gap="md">
              {Object.entries(groupedComponents).map(([group, comps]) => (
                <ComponentGroup
                  key={group}
                  groupName={group === "__ungrouped__" ? null : group}
                  components={comps}
                />
              ))}
            </Stack>
          </Box>

          {/* Subscribe */}
          <Paper p="md" withBorder>
            <Text fw={600} mb="sm">{t("Subscribe to Updates")}</Text>
            <SubscribeForm />
          </Paper>

          {/* Past Incidents */}
          {pastIncidents.length > 0 && (
            <Box>
              <Text fw={700} size="lg" mb="md">
                {t("Past Incidents")}
              </Text>
              <Stack gap="sm">
                {pastIncidents.slice(0, 20).map((inc: any) => (
                  <IncidentCard key={inc.id} incident={inc} />
                ))}
              </Stack>
            </Box>
          )}

          {/* Footer */}
          <Text ta="center" size="sm" c="dimmed" pt="md">
            Powered by <Anchor href="/admin/login" size="sm">PingFlare</Anchor>
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
