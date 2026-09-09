import { useState, useEffect } from "react";
import {
  ArrowPathIcon,
  EyeIcon,
  PlusIcon,
  SignalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../lib/api";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  Td,
  Textarea,
  Th,
  Toggle,
} from "../../components/ui";

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

const numOr = (value: string, fallback: number) => {
  if (value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

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
      <div className="flex justify-center py-16">
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Monitors"
        actions={
          <>
            <Button variant="secondary" onClick={load}>
              <ArrowPathIcon aria-hidden="true" className="size-4" />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <PlusIcon aria-hidden="true" className="size-4" />
              Add Monitor
            </Button>
          </>
        }
      />

      {monitors.length === 0 ? (
        <EmptyState
          icon={<SignalIcon aria-hidden="true" className="size-6" />}
          title="No monitors configured"
          description='Click "Add Monitor" to create one.'
          action={
            <Button onClick={openCreate}>
              <PlusIcon aria-hidden="true" className="size-4" />
              Add Monitor
            </Button>
          }
        />
      ) : (
        <Table>
          <thead className="bg-gray-50">
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>URL</Th>
              <Th>Status</Th>
              <Th>Interval</Th>
              <Th>Response</Th>
              <Th>Enabled</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {monitors.map((m) => (
              <tr key={m.id}>
                <Td className="font-medium">{m.name}</Td>
                <Td>
                  <Badge tone="gray">{m.type}</Badge>
                </Td>
                <Td className="max-w-[200px]">
                  <span className="block truncate text-sm/6 text-gray-500">{m.url || "N/A"}</span>
                </Td>
                <Td>
                  <Badge tone={statusColor(m.status)}>{m.status}</Badge>
                </Td>
                <Td>{m.interval}s</Td>
                <Td>{m.last_response_time ? `${m.last_response_time}ms` : "N/A"}</Td>
                <Td>
                  <div className="-my-3">
                    <Toggle
                      checked={!!m.enabled}
                      onChange={async () => {
                        await api.monitors.update(m.id, { enabled: m.enabled ? 0 : 1 });
                        load();
                      }}
                    />
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-x-2">
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => openEdit(m)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <EyeIcon aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => handleDelete(m.id)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Monitor" : "Add Monitor"}
        wide
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
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
              onChange={(e) => setForm({ ...form, type: e.target.value || "http" })}
            >
              <option value="http">HTTP/HTTPS</option>
              <option value="tcp">TCP</option>
            </Select>
          </Field>
          <Field label="URL" required>
            <Input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder={form.type === "http" ? "https://example.com" : "host:port"}
              required
            />
          </Field>
          {form.type === "http" && (
            <div className="space-y-5">
              <Field label="Expected Status Codes">
                <Input
                  value={form.expected_codes}
                  onChange={(e) => setForm({ ...form, expected_codes: e.target.value })}
                  placeholder="200,201,204"
                />
              </Field>
              <Field label="Keyword (optional)">
                <Input
                  value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                  placeholder="Text to find in response"
                />
              </Field>
              {form.keyword && (
                <Toggle
                  label="Keyword must NOT be present (forbidden)"
                  checked={form.keyword_forbidden}
                  onChange={(v) => setForm({ ...form, keyword_forbidden: v })}
                />
              )}
              <Field label="Custom Headers (JSON)">
                <Textarea
                  rows={3}
                  value={form.headers}
                  onChange={(e) => setForm({ ...form, headers: e.target.value })}
                  placeholder='{"Authorization": "Bearer ..."}'
                />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="Timeout (seconds)">
              <Input
                type="number"
                min={5}
                max={120}
                value={form.timeout}
                onChange={(e) => setForm({ ...form, timeout: numOr(e.target.value, 30) })}
              />
            </Field>
            <Field label="Check Interval (seconds)">
              <Input
                type="number"
                min={30}
                max={3600}
                value={form.interval}
                onChange={(e) => setForm({ ...form, interval: numOr(e.target.value, 60) })}
              />
            </Field>
            <Field label="Grace Period (checks)">
              <Input
                type="number"
                min={1}
                max={10}
                value={form.grace_period}
                onChange={(e) => setForm({ ...form, grace_period: numOr(e.target.value, 3) })}
              />
            </Field>
            <Field label="Degraded Threshold (ms)">
              <Input
                type="number"
                min={1000}
                value={form.degraded_threshold}
                onChange={(e) =>
                  setForm({ ...form, degraded_threshold: numOr(e.target.value, 5000) })
                }
              />
            </Field>
          </div>
          <Field label="Linked Component (optional)">
            <Select
              value={form.component_id}
              onChange={(e) => setForm({ ...form, component_id: e.target.value })}
            >
              <option value="">None</option>
              {components.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Toggle
            label="Enabled"
            checked={form.enabled}
            onChange={(v) => setForm({ ...form, enabled: v })}
          />
          <div className="flex justify-end gap-x-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save Changes" : "Create Monitor"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
