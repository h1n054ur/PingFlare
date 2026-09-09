import { useState, useEffect } from "react";
import { EnvelopeIcon, PlusIcon, TrashIcon, UsersIcon } from "@heroicons/react/24/outline";
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
  Th,
} from "../../components/ui";

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
      <div className="flex justify-center py-16">
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      </div>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Subscribers"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <PlusIcon aria-hidden="true" className="size-4" />
            Add Subscriber
          </Button>
        }
      />

      {subscribers.length === 0 ? (
        <EmptyState
          icon={<UsersIcon aria-hidden="true" className="size-6" />}
          title="No subscribers yet"
          description="Add subscribers to notify them about incidents and maintenance."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <PlusIcon aria-hidden="true" className="size-4" />
              Add Subscriber
            </Button>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th>Components</Th>
              <Th>Subscribed</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subscribers.map((s) => (
              <tr key={s.id}>
                <Td>
                  <div className="flex items-center gap-x-2">
                    <EnvelopeIcon aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
                    <span className="truncate">{s.email}</span>
                  </div>
                </Td>
                <Td>
                  <Badge tone={!!s.verified ? "green" : "yellow"}>
                    {!!s.verified ? "Verified" : "Pending"}
                  </Badge>
                </Td>
                <Td>
                  {s.components ? (
                    <span className="block max-w-[200px] truncate">
                      {JSON.parse(s.components).length} components
                    </span>
                  ) : (
                    <span className="text-gray-500">All</span>
                  )}
                </Td>
                <Td>{new Date(s.created_at).toLocaleDateString()}</Td>
                <Td>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(s.id)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Subscriber">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
          className="space-y-5"
        >
          <Field label="Email" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Component Subscriptions (optional)">
            <Select
              multiple
              value={componentIds}
              onChange={(e) => setComponentIds(Array.from(e.target.selectedOptions, (o) => o.value))}
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
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
