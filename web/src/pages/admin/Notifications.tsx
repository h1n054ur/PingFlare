import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Group,
  Text,
  Modal,
  TextInput,
  Select,
  Textarea,
  Stack,
  Badge,
  ActionIcon,
  Paper,
  Loader,
  Center,
  Switch,
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconTrash, IconSend } from "@tabler/icons-react";
import { api } from "../../lib/api";

const channelTypes = [
  { value: "webhook", label: "Generic Webhook" },
  { value: "slack", label: "Slack" },
  { value: "discord", label: "Discord" },
  { value: "telegram", label: "Telegram" },
  { value: "sendgrid", label: "Email (SendGrid)" },
  { value: "mailchannels", label: "Email (Mailchannels)" },
  { value: "ses", label: "Email (AWS SES)" },
  { value: "twilio", label: "SMS (Twilio)" },
];

export default function AdminNotifications() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "webhook",
    url: "",
    config: "",
  });
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const c = await api.notifications.list();
      setChannels(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    await api.notifications.create(form);
    setModalOpen(false);
    setForm({ name: "", type: "webhook", url: "", config: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this notification channel?")) return;
    await api.notifications.delete(id);
    load();
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    try {
      await api.notifications.test(id);
      setTestResult({ id, ok: true, message: "Test notification sent successfully!" });
    } catch (err) {
      setTestResult({
        id,
        ok: false,
        message: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setTesting(null);
    }
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
          Notification Channels
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Add Channel
        </Button>
      </Group>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>URL</Table.Th>
              <Table.Th>Enabled</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {channels.map((ch) => (
              <Table.Tr key={ch.id}>
                <Table.Td fw={500}>{ch.name}</Table.Td>
                <Table.Td>
                  <Badge variant="outline">{ch.type}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" truncate maw={250}>
                    {ch.url || "N/A"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Switch size="xs" checked={!!ch.enabled} readOnly />
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="Send test">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => handleTest(ch.id)}
                        loading={testing === ch.id}
                      >
                        <IconSend size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(ch.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                  {testResult && testResult.id === ch.id && (
                    <Text c={testResult.ok ? "green" : "red"} size="xs" mt={4}>
                      {testResult.message}
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {channels.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">
            No notification channels. Add webhooks, Slack, Discord, or email.
          </Text>
        )}
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Add Notification Channel">
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
            onChange={(v) => setForm({ ...form, type: v || "webhook" })}
            data={channelTypes}
          />
          {["webhook", "slack", "discord"].includes(form.type) && (
            <TextInput
              label="Webhook URL"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://hooks.example.com/..."
            />
          )}
          {form.type === "telegram" && (
            <>
              <TextInput
                label="Bot Token"
                value={form.config}
                onChange={(e) => setForm({ ...form, config: e.target.value })}
                placeholder="Telegram bot token"
              />
              <TextInput
                label="Chat ID"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="-1001234567890"
              />
            </>
          )}
          {["sendgrid", "mailchannels", "ses"].includes(form.type) && (
            <Textarea
              label="Email Config (JSON)"
              value={form.config}
              onChange={(e) => setForm({ ...form, config: e.target.value })}
              rows={4}
              placeholder='{"from": "status@example.com", "to": ["ops@example.com"], "apiKey": "..."}'
            />
          )}
          {form.type === "twilio" && (
            <Textarea
              label="SMS Config (JSON)"
              value={form.config}
              onChange={(e) => setForm({ ...form, config: e.target.value })}
              rows={4}
              placeholder='{"accountSid": "...", "authToken": "...", "from": "+15551234567", "to": ["+15559876543"]}'
            />
          )}
          {testResult && testResult.id === "new" && (
            <Text c={testResult.ok ? "green" : "red"} size="sm">
              {testResult.message}
            </Text>
          )}
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
