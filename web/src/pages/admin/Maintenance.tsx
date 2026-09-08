import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Group,
  Text,
  Modal,
  TextInput,
  Textarea,
  MultiSelect,
  Stack,
  Badge,
  ActionIcon,
  Paper,
  Loader,
  Center,
  Select,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { api } from "../../lib/api";

const maintenanceStatuses = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "verifying", label: "Verifying" },
  { value: "completed", label: "Completed" },
];

const statusColor = (s: string) => {
  if (s === "scheduled") return "blue";
  if (s === "in_progress") return "yellow";
  if (s === "verifying") return "orange";
  if (s === "completed") return "green";
  return "gray";
};

export default function AdminMaintenance() {
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_start: "",
    scheduled_end: "",
    component_ids: [] as string[],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([api.maintenances.list(), api.components.list()]);
      setMaintenances(m);
      setComponents(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    setForm({
      title: "",
      description: "",
      scheduled_start: start.toISOString().slice(0, 16),
      scheduled_end: end.toISOString().slice(0, 16),
      component_ids: [],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title,
      description: form.description,
      scheduled_start: new Date(form.scheduled_start).getTime(),
      scheduled_end: new Date(form.scheduled_end).getTime(),
      component_ids: form.component_ids,
    };
    await api.maintenances.create(payload);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this maintenance?")) return;
    await api.maintenances.delete(id);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await api.maintenances.update(id, { status });
    load();
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
          Scheduled Maintenance
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Schedule Maintenance
        </Button>
      </Group>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Start</Table.Th>
              <Table.Th>End</Table.Th>
              <Table.Th>Components</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {maintenances.map((m) => (
              <Table.Tr key={m.id}>
                <Table.Td fw={500}>{m.title}</Table.Td>
                <Table.Td>
                  <Select
                    size="xs"
                    variant="unstyled"
                    value={m.status}
                    onChange={(v) => updateStatus(m.id, v || "scheduled")}
                    data={maintenanceStatuses}
                    styles={{ input: { color: "inherit" } }}
                  />
                </Table.Td>
                <Table.Td>{new Date(m.scheduled_start).toLocaleString()}</Table.Td>
                <Table.Td>{new Date(m.scheduled_end).toLocaleString()}</Table.Td>
                <Table.Td>
                  <Badge variant="outline" size="sm">
                    {m.component_ids ? String(m.component_ids).split(",").length : 0} affected
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(m.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {maintenances.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">
            No scheduled maintenance.
          </Text>
        )}
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Maintenance"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
          <Group grow>
            <TextInput
              label="Start"
              type="datetime-local"
              value={form.scheduled_start}
              onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })}
            />
            <TextInput
              label="End"
              type="datetime-local"
              value={form.scheduled_end}
              onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })}
            />
          </Group>
          <MultiSelect
            label="Affected Components"
            value={form.component_ids}
            onChange={(v) => setForm({ ...form, component_ids: v })}
            data={components.map((c: any) => ({ value: c.id, label: c.name }))}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Schedule</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
