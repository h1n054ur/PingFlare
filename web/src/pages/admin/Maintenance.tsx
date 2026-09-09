import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
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
} from "../../components/ui";

const maintenanceStatuses = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "verifying", label: "Verifying" },
  { value: "completed", label: "Completed" },
];

const statusTone = (s: string): "blue" | "yellow" | "green" | "gray" => {
  if (s === "scheduled") return "blue";
  if (s === "in_progress") return "yellow";
  if (s === "verifying") return "yellow";
  if (s === "completed") return "green";
  return "gray";
};

const statusLabel = (s: string) =>
  maintenanceStatuses.find((x) => x.value === s)?.label || s;

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
      <div className="flex justify-center py-16">
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scheduled Maintenance"
        actions={
          <Button onClick={openCreate}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Schedule Maintenance
          </Button>
        }
      />

      {maintenances.length === 0 ? (
        <EmptyState
          icon={<WrenchScrewdriverIcon aria-hidden="true" className="size-6" />}
          title="No scheduled maintenance"
          description="Schedule maintenance windows to notify subscribers of upcoming downtime."
          action={
            <Button onClick={openCreate}>
              <PlusIcon aria-hidden="true" className="size-4" />
              Schedule Maintenance
            </Button>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Start</Th>
              <Th>End</Th>
              <Th>Components</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {maintenances.map((m) => (
              <tr key={m.id}>
                <Td className="font-medium">{m.title}</Td>
                <Td>
                  <div className="flex items-center gap-x-2">
                    <Badge tone={statusTone(m.status)}>{statusLabel(m.status)}</Badge>
                    <select
                      value={m.status}
                      onChange={(e) => updateStatus(m.id, e.target.value)}
                      className="rounded-md bg-white py-0.5 pl-2 pr-7 text-xs text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                    >
                      {maintenanceStatuses.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </Td>
                <Td>{new Date(m.scheduled_start).toLocaleString()}</Td>
                <Td>{new Date(m.scheduled_end).toLocaleString()}</Td>
                <Td>
                  <Badge>
                    {m.component_ids ? String(m.component_ids).split(",").length : 0} affected
                  </Badge>
                </Td>
                <Td>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(m.id)}
                  >
                    <TrashIcon aria-hidden="true" className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Maintenance"
        wide
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-5"
        >
          <Field label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <Field label="Start">
              <Input
                type="datetime-local"
                value={form.scheduled_start}
                onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })}
              />
            </Field>
            <Field label="End">
              <Input
                type="datetime-local"
                value={form.scheduled_end}
                onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Affected Components">
            <Select
              multiple
              value={form.component_ids}
              onChange={(e) =>
                setForm({
                  ...form,
                  component_ids: Array.from(e.target.selectedOptions, (o) => o.value),
                })
              }
              className="h-32"
            >
              {components.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-x-3">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
