import { useState, useEffect } from "react";
import {
  Bars2Icon,
  CheckIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
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
  classNames,
} from "../../components/ui";

const statusOptions = [
  { value: "operational", label: "Operational" },
  { value: "degraded_performance", label: "Degraded Performance" },
  { value: "partial_outage", label: "Partial Outage" },
  { value: "major_outage", label: "Major Outage" },
  { value: "under_maintenance", label: "Under Maintenance" },
];

type StatusTone = "green" | "yellow" | "red" | "gray" | "blue";

const statusColor = (s: string): StatusTone => {
  if (s === "operational") return "green";
  if (s === "degraded_performance") return "yellow";
  if (s === "partial_outage") return "yellow";
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
      <div className="flex justify-center py-16">
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Components & Groups"
        subtitle="Manage the services and groups displayed on your status page"
      />

      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("components")}
              className={classNames(
                activeTab === "components"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                "border-b-2 px-1 py-3 text-sm/6 font-medium"
              )}
            >
              Components ({components.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("groups")}
              className={classNames(
                activeTab === "groups"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                "border-b-2 px-1 py-3 text-sm/6 font-medium"
              )}
            >
              Component Groups ({groups.length})
            </button>
          </nav>
        </div>

        {activeTab === "components" && (
          <div className="mt-6">
            <div className="mb-4 flex justify-end">
              <Button onClick={openCreateComp}>
                <PlusIcon aria-hidden="true" className="size-4" />
                Add Component
              </Button>
            </div>
            {components.length === 0 ? (
              <EmptyState
                icon={<Squares2X2Icon aria-hidden="true" className="size-6" />}
                title="No components yet"
                description="Add one to get started."
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Name</Th>
                    <Th>Group</Th>
                    <Th>Status</Th>
                    <Th>Show Uptime</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {components.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <Td>
                        <Bars2Icon aria-hidden="true" className="size-4 text-gray-400" />
                      </Td>
                      <Td>
                        <div className="font-medium text-gray-900">{c.name}</div>
                        {c.description && (
                          <div className="mt-0.5 text-xs/5 text-gray-500">{c.description}</div>
                        )}
                      </Td>
                      <Td>
                        <Badge tone="gray">{c.group_name || "Ungrouped"}</Badge>
                      </Td>
                      <Td>
                        <Badge tone={statusColor(c.status)}>{c.status?.replace(/_/g, " ")}</Badge>
                      </Td>
                      <Td>
                        {c.show_uptime ? (
                          <CheckIcon aria-hidden="true" className="size-4 text-green-600" />
                        ) : (
                          <XMarkIcon aria-hidden="true" className="size-4 text-gray-400" />
                        )}
                      </Td>
                      <Td>
                        <div className="flex gap-x-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditComp(c)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteComp(c.id)}>
                            <TrashIcon aria-hidden="true" className="size-4 text-red-600" />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        )}

        {activeTab === "groups" && (
          <div className="mt-6">
            <div className="mb-4 flex justify-end">
              <Button onClick={openCreateGroup}>
                <PlusIcon aria-hidden="true" className="size-4" />
                Add Group
              </Button>
            </div>
            {groups.length === 0 ? (
              <EmptyState
                icon={<Squares2X2Icon aria-hidden="true" className="size-6" />}
                title="No component groups yet"
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Name</Th>
                    <Th>Description</Th>
                    <Th>Components</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groups.map((g) => {
                    const memberCount = components.filter((c) => c.group_id === g.id).length;
                    return (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <Td>{g.sort_order}</Td>
                        <Td className="font-medium text-gray-900">{g.name}</Td>
                        <Td className="text-gray-500">{g.description || "-"}</Td>
                        <Td>{memberCount}</Td>
                        <Td>
                          <div className="flex gap-x-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditGroup(g)}>
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteGroup(g.id)}>
                              <TrashIcon aria-hidden="true" className="size-4 text-red-600" />
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>
        )}
      </div>

      <Modal
        open={compModalOpen}
        onClose={() => setCompModalOpen(false)}
        title={editingComp ? "Edit Component" : "Add Component"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveComp();
          }}
          className="space-y-5"
        >
          <Field label="Name" required>
            <Input
              value={compForm.name}
              onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={2}
              value={compForm.description}
              onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
            />
          </Field>
          <Field label="Group">
            <Select
              value={compForm.group_id}
              onChange={(e) => setCompForm({ ...compForm, group_id: e.target.value })}
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status Override">
            <Select
              value={compForm.status}
              onChange={(e) => setCompForm({ ...compForm, status: e.target.value })}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort Order">
            <Input
              type="number"
              min={0}
              value={compForm.sort_order}
              onChange={(e) =>
                setCompForm({ ...compForm, sort_order: parseInt(e.target.value, 10) || 0 })
              }
            />
          </Field>
          <Toggle
            label="Show uptime bar"
            checked={compForm.show_uptime}
            onChange={(v) => setCompForm({ ...compForm, show_uptime: v })}
          />
          <div className="flex justify-end gap-x-3">
            <Button type="button" variant="secondary" onClick={() => setCompModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingComp ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title={editingGroup ? "Edit Group" : "Add Group"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveGroup();
          }}
          className="space-y-5"
        >
          <Field label="Name" required>
            <Input
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={2}
              value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
            />
          </Field>
          <Field label="Sort Order">
            <Input
              type="number"
              min={0}
              value={groupForm.sort_order}
              onChange={(e) =>
                setGroupForm({ ...groupForm, sort_order: parseInt(e.target.value, 10) || 0 })
              }
            />
          </Field>
          <div className="flex justify-end gap-x-3">
            <Button type="button" variant="secondary" onClick={() => setGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingGroup ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
