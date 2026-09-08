import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Group,
  Text,
  Modal,
  TextInput,
  Select,
  MultiSelect,
  Textarea,
  Stack,
  Badge,
  ActionIcon,
  Paper,
  Loader,
  Center,
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { api } from "../../lib/api";

const incidentStatuses = [
  { value: "investigating", label: "Investigating" },
  { value: "identified", label: "Identified" },
  { value: "monitoring", label: "Monitoring" },
  { value: "resolved", label: "Resolved" },
  { value: "postmortem", label: "Postmortem" },
];

const severities = [
  { value: "minor", label: "Minor" },
  { value: "major", label: "Major" },
  { value: "critical", label: "Critical" },
];

const statusColor = (s: string) => {
  if (s === "investigating") return "blue";
  if (s === "identified") return "yellow";
  if (s === "monitoring") return "orange";
  if (s === "resolved" || s === "postmortem") return "green";
  return "gray";
};

export default function AdminIncidents() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [form, setForm] = useState({
    title: "",
    status: "investigating",
    severity: "minor",
    impact: "none",
    message: "",
    component_ids: [] as string[],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [i, c] = await Promise.all([api.incidents.list(), api.components.list()]);
      setIncidents(i);
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
    setForm({ title: "", status: "investigating", severity: "minor", impact: "none", message: "", component_ids: [] });
    setModalOpen(true);
  };

  const openEdit = (inc: any) => {
    setEditing(inc);
    setForm({
      title: inc.title,
      status: inc.status,
      severity: inc.severity,
      impact: inc.impact || "none",
      message: "",
      component_ids: inc.component_ids ? String(inc.component_ids).split(",") : [],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (editing) {
      const updates: any = {
        status: form.status,
        severity: form.severity,
        impact: form.impact,
        component_ids: form.component_ids,
      };
      if (form.message) updates.message = form.message;
      await api.incidents.update(editing.id, updates);
    } else {
      const payload = {
        title: form.title,
        status: form.status,
        severity: form.severity,
        impact: form.impact,
        component_ids: form.component_ids,
        message: form.message || `Incident created: ${form.title}`,
      };
      await api.incidents.create(payload);
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this incident?")) return;
    await api.incidents.delete(id);
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
          Incidents
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Create Incident
        </Button>
      </Group>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Title</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Severity</Table.Th>
              <Table.Th>Impact</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {incidents.map((inc) => (
              <Table.Tr key={inc.id}>
                <Table.Td fw={500}>{inc.title}</Table.Td>
                <Table.Td>
                  <Badge color={statusColor(inc.status)} variant="light">
                    {inc.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={inc.severity === "critical" ? "red" : inc.severity === "major" ? "orange" : "yellow"} variant="light">
                    {inc.severity}
                  </Badge>
                </Table.Td>
                <Table.Td>{inc.impact || "none"}</Table.Td>
                <Table.Td>{new Date(inc.created_at).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" onClick={() => openEdit(inc)}>
                      <Text size="xs">Edit</Text>
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(inc.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {incidents.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">
            No incidents. Create one to start communicating with subscribers.
          </Text>
        )}
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Update Incident" : "Create Incident"}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            disabled={!!editing}
            required
          />
          <Group grow>
            <Select
              label="Status"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v || "investigating" })}
              data={incidentStatuses}
            />
            <Select
              label="Severity"
              value={form.severity}
              onChange={(v) => setForm({ ...form, severity: v || "minor" })}
              data={severities}
            />
          </Group>
          <MultiSelect
            label="Affected Components"
            value={form.component_ids}
            onChange={(v) => setForm({ ...form, component_ids: v })}
            data={components.map((c: any) => ({ value: c.id, label: c.name }))}
          />
          <Textarea
            label={editing ? "New Update Message" : "Initial Message"}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={4}
            placeholder="What's happening?"
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editing ? "Post Update" : "Create Incident"}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
