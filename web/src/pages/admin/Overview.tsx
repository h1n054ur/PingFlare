import { useState, useEffect } from "react";
import {
  SimpleGrid,
  Paper,
  Text,
  Group,
  Stack,
  Badge,
  Loader,
  Center,
  ThemeIcon,
  RingProgress,
} from "@mantine/core";
import {
  IconActivity,
  IconAlertTriangle,
  IconCheck,
  IconPackages,
  IconClock,
} from "@tabler/icons-react";
import { api } from "../../lib/api";

export default function AdminOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  if (!data) return <Text c="red">Failed to load dashboard</Text>;

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
    if (s === "partial_outage") return "orange";
    if (s === "major_outage") return "red";
    if (s === "under_maintenance") return "blue";
    return "gray";
  };

  return (
    <Stack gap="lg">
      <Text fw={700} size="xl">
        Overview
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <Paper p="md" withBorder>
          <Group>
            <ThemeIcon color="blue" variant="light" size="lg">
              <IconActivity size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">
                Monitors
              </Text>
              <Text fw={700} size="xl">
                {totalMonitors}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" withBorder>
          <Group>
            <ThemeIcon color="green" variant="light" size="lg">
              <IconCheck size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">
                Up
              </Text>
              <Text fw={700} size="xl" c="green">
                {upMonitors}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" withBorder>
          <Group>
            <ThemeIcon color="red" variant="light" size="lg">
              <IconAlertTriangle size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">
                Down
              </Text>
              <Text fw={700} size="xl" c="red">
                {downMonitors}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" withBorder>
          <Group>
            <ThemeIcon color="orange" variant="light" size="lg">
              <IconAlertTriangle size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">
                Active Incidents
              </Text>
              <Text fw={700} size="xl">
                {incidents.length}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper p="md" withBorder>
          <Text fw={600} mb="sm">
            Overall Status
          </Text>
          <Group>
            <RingProgress
              size={80}
              thickness={8}
              sections={[
                {
                  value: totalMonitors > 0 ? (upMonitors / totalMonitors) * 100 : 100,
                  color: downMonitors > 0 ? "red" : "green",
                },
              ]}
              label={
                <Text ta="center" size="xs" fw={700}>
                  {totalMonitors > 0
                    ? `${Math.round((upMonitors / totalMonitors) * 100)}%`
                    : "N/A"}
                </Text>
              }
            />
            <div>
              <Badge color={statusColor(data.overallStatus?.status || "operational")} size="lg">
                {data.overallStatus?.description || "No Status"}
              </Badge>
              <Text size="sm" c="dimmed" mt="xs">
                {upMonitors} of {totalMonitors} monitors up
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" withBorder>
          <Text fw={600} mb="sm">
            Components
          </Text>
          <Stack gap="xs">
            {components.length === 0 && (
              <Text size="sm" c="dimmed">
                No components configured
              </Text>
            )}
            {components.slice(0, 8).map((c: any) => (
              <Group key={c.id} justify="space-between">
                <Text size="sm">{c.name}</Text>
                <Badge color={statusColor(c.status)} variant="light" size="sm">
                  {c.status?.replace(/_/g, " ")}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Paper>
      </SimpleGrid>

      {incidents.length > 0 && (
        <Paper p="md" withBorder>
          <Text fw={600} mb="sm">
            Active Incidents
          </Text>
          <Stack gap="xs">
            {incidents.map((inc: any) => (
              <Group key={inc.id} justify="space-between">
                <div>
                  <Text size="sm" fw={500}>
                    {inc.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(inc.created_at).toLocaleString()}
                  </Text>
                </div>
                <Badge color={inc.severity === "major" ? "red" : "yellow"} variant="light">
                  {inc.status}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      {maintenances.length > 0 && (
        <Paper p="md" withBorder>
          <Text fw={600} mb="sm">
            Upcoming Maintenance
          </Text>
          <Stack gap="xs">
            {maintenances.map((m: any) => (
              <Group key={m.id} justify="space-between">
                <div>
                  <Text size="sm" fw={500}>
                    {m.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(m.scheduled_start).toLocaleString()} -{" "}
                    {new Date(m.scheduled_end).toLocaleString()}
                  </Text>
                </div>
                <Badge color="blue" variant="light">
                  {m.status}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
