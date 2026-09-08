import { useState, useEffect } from "react";
import {
  Stack,
  Text,
  Paper,
  SimpleGrid,
  TextInput,
  Textarea,
  Select,
  Switch,
  Button,
  Loader,
  Center,
  Group,
  Divider,
  PasswordInput,
} from "@mantine/core";
import { api } from "../../lib/api";
import { adminLogout } from "../../lib/api";

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings
      .get()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.settings.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
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
          Settings
        </Text>
        {saved && <Text c="green" size="sm">Saved!</Text>}
      </Group>

      {/* General */}
      <Paper p="lg" withBorder>
        <Text fw={600} mb="md">
          General
        </Text>
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <TextInput
            label="Page Title"
            value={settings.page_title || ""}
            onChange={(e) => update("page_title", e.target.value)}
          />
          <TextInput
            label="Page URL"
            value={settings.page_url || ""}
            onChange={(e) => update("page_url", e.target.value)}
            placeholder="https://status.example.com"
          />
          <TextInput
            label="Logo URL"
            value={settings.logo_url || ""}
            onChange={(e) => update("logo_url", e.target.value)}
          />
          <TextInput
            label="Favicon URL"
            value={settings.favicon_url || ""}
            onChange={(e) => update("favicon_url", e.target.value)}
          />
          <Textarea
            label="Page Description"
            value={settings.page_description || ""}
            onChange={(e) => update("page_description", e.target.value)}
            rows={2}
          />
        </SimpleGrid>
      </Paper>

      {/* Localization */}
      <Paper p="lg" withBorder>
        <Text fw={600} mb="md">
          Localization
        </Text>
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Select
            label="Timezone"
            value={settings.timezone || "UTC"}
            onChange={(v) => update("timezone", v || "UTC")}
            data={[
              "UTC",
              "America/New_York",
              "America/Chicago",
              "America/Denver",
              "America/Los_Angeles",
              "Europe/London",
              "Europe/Paris",
              "Europe/Berlin",
              "Asia/Tokyo",
              "Asia/Singapore",
              "Australia/Sydney",
            ].map((tz) => ({ value: tz, label: tz }))}
          />
          <TextInput
            label="Date Format"
            value={settings.date_format || ""}
            onChange={(e) => update("date_format", e.target.value)}
          />
        </SimpleGrid>
      </Paper>

      {/* Automation */}
      <Paper p="lg" withBorder>
        <Text fw={600} mb="md">
          Automation
        </Text>
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <TextInput
            label="Auto-Resolve After (hours)"
            value={settings.auto_resolve_hours || "4"}
            onChange={(e) => update("auto_resolve_hours", e.target.value)}
            type="number"
          />
        </SimpleGrid>
        <Group mt="md">
          <Switch
            label="Notify on incident create"
            checked={settings.notify_on_create === "1"}
            onChange={(e) => update("notify_on_create", e.currentTarget.checked ? "1" : "0")}
          />
          <Switch
            label="Notify on incident update"
            checked={settings.notify_on_update === "1"}
            onChange={(e) => update("notify_on_update", e.currentTarget.checked ? "1" : "0")}
          />
          <Switch
            label="Notify on resolve"
            checked={settings.notify_on_resolve === "1"}
            onChange={(e) => update("notify_on_resolve", e.currentTarget.checked ? "1" : "0")}
          />
        </Group>
      </Paper>

      {/* Appearance */}
      <Paper p="lg" withBorder>
        <Text fw={600} mb="md">
          Appearance
        </Text>
        <Stack gap="md">
          <Textarea
            label="Custom CSS"
            value={settings.custom_css || ""}
            onChange={(e) => update("custom_css", e.target.value)}
            rows={4}
          />
          <Textarea
            label="Custom HTML (head)"
            value={settings.custom_html_head || ""}
            onChange={(e) => update("custom_html_head", e.target.value)}
            rows={2}
          />
          <Textarea
            label="Custom HTML (footer)"
            value={settings.custom_html_footer || ""}
            onChange={(e) => update("custom_html_footer", e.target.value)}
            rows={2}
          />
        </Stack>
      </Paper>

      {/* Security */}
      <Paper p="lg" withBorder>
        <Text fw={600} mb="md">
          Security
        </Text>
        <Stack gap="md">
          <Switch
            label="Password protect public page"
            checked={settings.password_protect === "1"}
            onChange={(e) => update("password_protect", e.currentTarget.checked ? "1" : "0")}
          />
          <Divider />
          <Text size="sm" c="dimmed">
            Authentication is handled by Better Auth. Use the button below to sign out.
          </Text>
          <Button
            variant="light"
            color="red"
            onClick={async () => {
              await adminLogout();
              window.location.href = "/admin/login";
            }}
          >
            Sign Out
          </Button>
        </Stack>
      </Paper>

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={saving}>
          Save All Settings
        </Button>
      </Group>
    </Stack>
  );
}
