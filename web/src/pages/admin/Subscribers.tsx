import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Group,
  Text,
  Modal,
  TextInput,
  Stack,
  Badge,
  ActionIcon,
  Paper,
  Loader,
  Center,
  MultiSelect,
} from "@mantine/core";
import { IconPlus, IconTrash, IconMail } from "@tabler/icons-react";
import { api } from "../../lib/api";

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [componentIds, setComponentIds] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([api.subscribers.list(), api.components.list()]);
      setSubscribers(s);
      setComponents(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    await api.subscribers.create({ email, components: componentIds });
    setModalOpen(false);
    setEmail("");
    setComponentIds([]);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subscriber?")) return;
    await api.subscribers.delete(id);
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
          Subscribers
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Add Subscriber
        </Button>
      </Group>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Email</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Components</Table.Th>
              <Table.Th>Subscribed</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {subscribers.map((s) => (
              <Table.Tr key={s.id}>
                <Table.Td>
                  <Group gap="xs">
                    <IconMail size={14} />
                    <Text size="sm">{s.email}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color={!!s.verified ? "green" : "yellow"} variant="light">
                    {!!s.verified ? "Verified" : "Pending"}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {s.components ? (
                    <Text size="sm" truncate maw={200}>
                      {JSON.parse(s.components).length} components
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      All
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>{new Date(s.created_at).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(s.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {subscribers.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">
            No subscribers yet.
          </Text>
        )}
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Add Subscriber">
        <Stack gap="md">
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <MultiSelect
            label="Component Subscriptions (optional)"
            value={componentIds}
            onChange={setComponentIds}
            data={components.map((c: any) => ({ value: c.id, label: c.name }))}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
