import { useState, useEffect } from "react";
import {
  BellAlertIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../lib/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
  classNames,
} from "../../components/ui";

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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notification Channels"
        subtitle="Webhooks, chat apps, email, and SMS delivery channels"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Add Channel
          </Button>
        }
      />

      {channels.length === 0 ? (
        <EmptyState
          icon={<BellAlertIcon aria-hidden="true" className="size-6" />}
          title="No notification channels"
          description="Add webhooks, Slack, Discord, or email."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <PlusIcon aria-hidden="true" className="size-4" />
              Add Channel
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {channels.map((ch) => (
            <Card key={ch.id} className="p-6">
              <div className="flex items-start justify-between gap-x-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-sm/6 font-semibold text-gray-900">{ch.name}</h3>
                    <Badge tone="gray">{ch.type}</Badge>
                  </div>
                  <p className="mt-1.5 truncate text-xs/5 text-gray-500">{ch.url || "N/A"}</p>
                </div>
                <Badge tone={ch.enabled ? "green" : "gray"}>
                  {ch.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              {testResult && testResult.id === ch.id && (
                <div className="mt-4">
                  <Alert tone={testResult.ok ? "success" : "error"}>{testResult.message}</Alert>
                </div>
              )}

              <div className="mt-4 flex items-center gap-x-3 border-t border-gray-200 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  title="Send test"
                  onClick={() => handleTest(ch.id)}
                  disabled={testing === ch.id}
                >
                  {testing === ch.id ? (
                    <span className="size-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
                  ) : (
                    <PaperAirplaneIcon aria-hidden="true" className="size-4" />
                  )}
                  Send Test
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDelete(ch.id)}
                >
                  <TrashIcon aria-hidden="true" className="size-4" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Notification Channel"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
          className="space-y-5"
        >
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Type">
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {channelTypes.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </Select>
          </Field>
          {["webhook", "slack", "discord"].includes(form.type) && (
            <Field label="Webhook URL">
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://hooks.example.com/..."
              />
            </Field>
          )}
          {form.type === "telegram" && (
            <>
              <Field label="Bot Token">
                <Input
                  value={form.config}
                  onChange={(e) => setForm({ ...form, config: e.target.value })}
                  placeholder="Telegram bot token"
                />
              </Field>
              <Field label="Chat ID">
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="-1001234567890"
                />
              </Field>
            </>
          )}
          {["sendgrid", "mailchannels", "ses"].includes(form.type) && (
            <Field label="Email Config (JSON)">
              <Textarea
                rows={4}
                value={form.config}
                onChange={(e) => setForm({ ...form, config: e.target.value })}
                placeholder='{"from": "status@example.com", "to": ["ops@example.com"], "apiKey": "..."}'
              />
            </Field>
          )}
          {form.type === "twilio" && (
            <Field label="SMS Config (JSON)">
              <Textarea
                rows={4}
                value={form.config}
                onChange={(e) => setForm({ ...form, config: e.target.value })}
                placeholder='{"accountSid": "...", "authToken": "...", "from": "+15551234567", "to": ["+15559876543"]}'
              />
            </Field>
          )}
          {testResult && testResult.id === "new" && (
            <Alert tone={testResult.ok ? "success" : "error"}>{testResult.message}</Alert>
          )}
          <div className="flex justify-end gap-x-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Channel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
