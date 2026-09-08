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
  Tabs,
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconTrash, IconGripVertical } from "@tabler/icons-react";
import { api } from "../../lib/api";

const statusOptions = [
  { value: "operational", label: "Operational" },
  { value: "degraded_performance", label: "Degraded Performance" },
  { value: "partial_outage", label: "Partial Outage" },
  { value: "major_outage", label: "Major Outage" },
  { value: "under_maintenance", label: "Under Maintenance" },
];

const statusColor = (s: string) => {
  if (s === "operational") return "green";
  if (s === "degraded_performance") return "yellow";
  if (s === "partial_outage") return "orange";
  if (s === "major_outage") return "red";
  if (s === "under_maintenance") return "blue";
  return "gray";
};

export default function AdminComponents() {
  const [components, setComponents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>("components");
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<any>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);

  const [compForm, setCompForm] = useState({
    name: "",
    description: "",
    group_id: "",
    show_uptime: true,
    sort_order: 0,
    status: "operational",
  });

  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    sort_order: 0,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [c, g] = await Promise.all([api.components.list(), api.groups.list()]);
      setComponents(c);
      setGroups(g);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreateComp = () => {
    setEditingComp(null);
    setCompForm({ name: "", description: "", group_id: "", show_uptime: true, sort_order: 0, status: "operational" });
    setCompModalOpen(true);
  };

  const openEditComp = (c: any) => {
    setEditingComp(c);
    setCompForm({
      name: c.name,
      description: c.description || "",
      group_id: c.group_id || "",
      show_uptime: !!c.show_uptime,
      sort_order: c.sort_order,
      status: c.status,
    });
    setCompModalOpen(true);
  };

  const saveComp = async () => {
    const payload = {
      ...compForm,
      group_id: compForm.group_id || null,
      show_uptime: compForm.show_uptime ? 1 : 0,
    };
    if (editingComp) {
      await api.components.update(editingComp.id, payload);
    } else {
      await api.components.create(payload);
    }
    setCompModalOpen(false);
    load();
  };

  const deleteComp = async (id: string) => {
    if (!confirm("Delete this component?")) return;
    await api.components.delete(id);
    load();
  };

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: "", description: "", sort_order: 0 });
    setGroupModalOpen(true);
  };

  const openEditGroup = (g: any) => {
    setEditingGroup(g);
    setGroupForm({ name: g.name, description: g.description || "", sort_order: g.sort_order });
    setGroupModalOpen(true);
  };

  const saveGroup = async () => {
    if (editingGroup) {
      await api.groups.update(editingGroup.id, groupForm);
    } else {
      await api.groups.create(groupForm);
    }
    setGroupModalOpen(false);
    load();
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete this group? Components will be ungrouped.")) return;
    await api.groups.delete(id);
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
      <Text fw={700} size="xl">
        Components & Groups
      </Text>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="components">Components ({components.length})</Tabs.Tab>
          <Tabs.Tab value="groups">Component Groups ({groups.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="components" pt="md">
          <Group justify="flex-end" mb="md">
            <Button leftSection={<IconPlus size={16} />} onClick={openCreateComp}>
              Add Component
            </Button>
          </Group>
          <Paper withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Order</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Group</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Show Uptime</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {components.map((c) => (
                  <Table.Tr key={c.id}>
                    <Table.Td>
                      <IconGripVertical size={14} color="gray" />
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text fw={500}>{c.name}</Text>
                        {c.description && (
                          <Text size="xs" c="dimmed">
                            {c.description}
                          </Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="outline" size="sm">
                        {c.group_name || "Ungrouped"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(c.status)} variant="light">
                        {c.status?.replace(/_/g, " ")}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Switch size="xs" checked={!!c.show_uptime} readOnly />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" onClick={() => openEditComp(c)}>
                          <Text size="xs">Edit</Text>
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => deleteComp(c.id)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {components.length === 0 && (
              <Text ta="center" py="xl" c="dimmed">
                No components yet. Add one to get started.
              </Text>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="groups" pt="md">
          <Group justify="flex-end" mb="md">
            <Button leftSection={<IconPlus size={16} />} onClick={openCreateGroup}>
              Add Group
            </Button>
          </Group>
          <Paper withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Order</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Components</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {groups.map((g) => {
                  const memberCount = components.filter((c) => c.group_id === g.id).length;
                  return (
                    <Table.Tr key={g.id}>
                      <Table.Td>{g.sort_order}</Table.Td>
                      <Table.Td fw={500}>{g.name}</Table.Td>
                      <Table.Td c="dimmed">{g.description || "-"}</Table.Td>
                      <Table.Td>{memberCount}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon variant="subtle" onClick={() => openEditGroup(g)}>
                            <Text size="xs">Edit</Text>
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={() => deleteGroup(g.id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
            {groups.length === 0 && (
              <Text ta="center" py="xl" c="dimmed">
                No component groups yet.
              </Text>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Component Modal */}
      <Modal
        opened={compModalOpen}
        onClose={() => setCompModalOpen(false)}
        title={editingComp ? "Edit Component" : "Add Component"}
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={compForm.name}
            onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={compForm.description}
            onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
            rows={2}
          />
          <Select
            label="Group"
            value={compForm.group_id}
            onChange={(v) => setCompForm({ ...compForm, group_id: v || "" })}
            data={groups.map((g) => ({ value: g.id, label: g.name }))}
            clearable
          />
          <Select
            label="Status Override"
            value={compForm.status}
            onChange={(v) => setCompForm({ ...compForm, status: v || "operational" })}
            data={statusOptions}
          />
          <NumberInput
            label="Sort Order"
            value={compForm.sort_order}
            onChange={(v) => setCompForm({ ...compForm, sort_order: typeof v === "number" ? v : 0 })}
            min={0}
          />
          <Switch
            label="Show uptime bar"
            checked={compForm.show_uptime}
            onChange={(e) => setCompForm({ ...compForm, show_uptime: e.currentTarget.checked })}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setCompModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveComp}>{editingComp ? "Save" : "Create"}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Group Modal */}
      <Modal
        opened={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title={editingGroup ? "Edit Group" : "Add Group"}
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={groupForm.name}
            onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={groupForm.description}
            onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
            rows={2}
          />
          <NumberInput
            label="Sort Order"
            value={groupForm.sort_order}
            onChange={(v) => setGroupForm({ ...groupForm, sort_order: typeof v === "number" ? v : 0 })}
            min={0}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveGroup}>{editingGroup ? "Save" : "Create"}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
