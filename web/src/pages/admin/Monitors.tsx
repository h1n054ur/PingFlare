import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Group,
  Text,
  Modal,
  TextInput,
  Select,
  Switch,
  NumberInput,
  Stack,
  Badge,
  ActionIcon,
  Paper,
  Textarea,
  Loader,
  Center,
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconTrash, IconRefresh, IconEye, IconEyeOff } from "@tabler/icons-react";
import { api } from "../../lib/api";

interface Monitor {
  id: string;
  name: string;
  type: string;
  url: string | null;
  method: string;
  expected_codes: string | null;
  keyword: string | null;
  keyword_forbidden: number;
  headers: string | null;
  timeout: number;
  interval: number;
  grace_period: number;
  degraded_threshold: number;
  enabled: number;
  status: string;
  last_checked: number | null;
  last_response_time: number | null;
  component_id: string | null;
}

export default function AdminMonitors() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Monitor | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "http",
    url: "",
    method: "GET",
    expected_codes: "200",
    keyword: "",
    keyword_forbidden: false,
    headers: "",
    timeout: 30,
    interval: 60,
    grace_period: 3,
    degraded_threshold: 5000,
    enabled: true,
    component_id: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([api.monitors.list(), api.components.list()]);
      setMonitors(m);
      setComponents(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      type: "http",
      url: "",
      method: "GET",
      expected_codes: "200",
      keyword: "",
      keyword_forbidden: false,
      headers: "",
      timeout: 30,
      interval: 60,
      grace_period: 3,
      degraded_threshold: 5000,
      enabled: true,
      component_id: "",
    });
    setModalOpen(true);
  };

  const openEdit = (m: Monitor) => {
    setEditing(m);
    setForm({
      name: m.name,
      type: m.type,
      url: m.url || "",
      method: m.method,
      expected_codes: m.expected_codes || "200",
      keyword: m.keyword || "",
      keyword_forbidden: !!m.keyword_forbidden,
      headers: m.headers || "",
      timeout: m.timeout,
      interval: m.interval,
      grace_period: m.grace_period,
      degraded_threshold: m.degraded_threshold,
      enabled: !!m.enabled,
      component_id: m.component_id || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      keyword_forbidden: form.keyword_forbidden ? 1 : 0,
      enabled: form.enabled ? 1 : 0,
      component_id: form.component_id || null,
    };
    if (editing) {
      await api.monitors.update(editing.id, payload);
    } else {
      await api.monitors.create(payload);
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this monitor?")) return;
    await api.monitors.delete(id);
    load();
  };

  const statusColor = (s: string) => {
    if (s === "up") return "green";
    if (s === "down") return "red";
    if (s === "degraded") return "yellow";
    return "gray";
  };

  if (loading)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Text fw={700} size="xl">
          Monitors
        </Text>
        <Group>
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={load}>
            Refresh
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Add Monitor
          </Button>
        </Group>
      </Group>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>URL</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Interval</Table.Th>
              <Table.Th>Response</Table.Th>
              <Table.Th>Enabled</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {monitors.map((m) => (
              <Table.Tr key={m.id}>
                <Table.Td fw={500}>{m.name}</Table.Td>
                <Table.Td>
                  <Badge variant="outline">{m.type}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" truncate maw={200}>
                    {m.url || "N/A"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={statusColor(m.status)} variant="light">
                    {m.status}
                  </Badge>
                </Table.Td>
                <Table.Td>{m.interval}s</Table.Td>
                <Table.Td>
                  {m.last_response_time ? `${m.last_response_time}ms` : "N/A"}
                </Table.Td>
                <Table.Td>
                  <Switch
                    size="xs"
                    checked={!!m.enabled}
                    onChange={async () => {
                      await api.monitors.update(m.id, { enabled: m.enabled ? 0 : 1 });
                      load();
                    }}
                  />
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="Edit">
                      <ActionIcon variant="subtle" onClick={() => openEdit(m)}>
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(m.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {monitors.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">
            No monitors configured. Click "Add Monitor" to create one.
          </Text>
        )}
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Monitor" : "Add Monitor"}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v || "http" })}
            data={[
              { value: "http", label: "HTTP/HTTPS" },
              { value: "tcp", label: "TCP" },
            ]}
          />
          <TextInput
            label="URL"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder={form.type === "http" ? "https://example.com" : "host:port"}
            required
          />
          {form.type === "http" && (
            <>
              <TextInput
                label="Expected Status Codes"
                value={form.expected_codes}
                onChange={(e) => setForm({ ...form, expected_codes: e.target.value })}
                placeholder="200,201,204"
              />
              <TextInput
                label="Keyword (optional)"
                value={form.keyword}
                onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                placeholder="Text to find in response"
              />
              {form.keyword && (
                <Switch
                  label="Keyword must NOT be present (forbidden)"
                  checked={form.keyword_forbidden}
                  onChange={(e) => setForm({ ...form, keyword_forbidden: e.currentTarget.checked })}
                />
              )}
              <Textarea
                label="Custom Headers (JSON)"
                value={form.headers}
                onChange={(e) => setForm({ ...form, headers: e.target.value })}
                placeholder='{"Authorization": "Bearer ..."}'
                rows={3}
              />
            </>
          )}
          <Group grow>
            <NumberInput
              label="Timeout (seconds)"
              value={form.timeout}
              onChange={(v) => setForm({ ...form, timeout: typeof v === "number" ? v : 30 })}
              min={5}
              max={120}
            />
            <NumberInput
              label="Check Interval (seconds)"
              value={form.interval}
              onChange={(v) => setForm({ ...form, interval: typeof v === "number" ? v : 60 })}
              min={30}
              max={3600}
            />
          </Group>
          <Group grow>
            <NumberInput
              label="Grace Period (checks)"
              value={form.grace_period}
              onChange={(v) => setForm({ ...form, grace_period: typeof v === "number" ? v : 3 })}
              min={1}
              max={10}
            />
            <NumberInput
              label="Degraded Threshold (ms)"
              value={form.degraded_threshold}
              onChange={(v) => setForm({ ...form, degraded_threshold: typeof v === "number" ? v : 5000 })}
              min={1000}
            />
          </Group>
          <Select
            label="Linked Component (optional)"
            value={form.component_id}
            onChange={(v) => setForm({ ...form, component_id: v || "" })}
            data={components.map((c: any) => ({ value: c.id, label: c.name }))}
            clearable
          />
          <Switch
            label="Enabled"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.currentTarget.checked })}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editing ? "Save Changes" : "Create Monitor"}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
