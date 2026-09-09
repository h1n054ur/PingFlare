import { useState, useEffect } from "react";
import { ExclamationTriangleIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
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
  classNames,
} from "../../components/ui";

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

type StatusTone = "green" | "yellow" | "red" | "gray" | "blue";

const statusColor = (s: string): StatusTone => {
  if (s === "investigating") return "blue";
  if (s === "identified") return "yellow";
  if (s === "monitoring") return "blue";
  if (s === "resolved" || s === "postmortem") return "green";
  return "gray";
};

const severityColor = (s: string): StatusTone => {
  if (s === "critical") return "red";
  if (s === "major") return "yellow";
  return "yellow";
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
      <div className="flex justify-center py-16">
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Incidents"
        subtitle="Track and communicate service disruptions"
        actions={
          <Button onClick={openCreate}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Create Incident
          </Button>
        }
      />

      {incidents.length === 0 ? (
        <EmptyState
          icon={<ExclamationTriangleIcon aria-hidden="true" className="size-6" />}
          title="No incidents"
          description="Create one to start communicating with subscribers."
          action={
            <Button onClick={openCreate}>
              <PlusIcon aria-hidden="true" className="size-4" />
              Create Incident
            </Button>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Severity</Th>
              <Th>Impact</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {incidents.map((inc) => (
              <tr key={inc.id} className="hover:bg-gray-50">
                <Td className="font-medium text-gray-900">{inc.title}</Td>
                <Td>
                  <Badge tone={statusColor(inc.status)}>{inc.status}</Badge>
                </Td>
                <Td>
                  <Badge tone={severityColor(inc.severity)}>{inc.severity}</Badge>
                </Td>
                <Td>{inc.impact || "none"}</Td>
                <Td>{new Date(inc.created_at).toLocaleDateString()}</Td>
                <Td>
                  <div className="flex gap-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(inc)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(inc.id)}>
                      <TrashIcon aria-hidden="true" className="size-4 text-red-600" />
                    </Button>
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
        title={editing ? "Update Incident" : "Create Incident"}
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
              disabled={!!editing}
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {incidentStatuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Severity">
              <Select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              >
                {severities.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Affected Components">
            <div className="flex flex-wrap gap-2">
              {components.map((c: any) => {
                const selected = form.component_ids.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        component_ids: selected
                          ? form.component_ids.filter((id) => id !== c.id)
                          : [...form.component_ids, c.id],
                      })
                    }
                    className={classNames(
                      selected
                        ? "bg-indigo-600 text-white ring-indigo-600"
                        : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50",
                      "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset"
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={editing ? "New Update Message" : "Initial Message"}>
            <Textarea
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="What's happening?"
            />
          </Field>
          <div className="flex justify-end gap-x-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Post Update" : "Create Incident"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
