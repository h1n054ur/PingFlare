import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useSession, changePassword, signOut } from "../../lib/auth-client";
import { api } from "../../lib/api";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  Toggle,
} from "../../components/ui";
import { PasswordField } from "../../components/PasswordField";

const TIMEZONES = [
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
];

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
        title="Settings"
        subtitle="Page configuration, appearance, and account security"
        actions={
          saved ? (
            <span className="flex items-center gap-x-1.5 text-sm/6 font-medium text-green-600">
              <CheckIcon className="size-4" /> Saved
            </span>
          ) : undefined
        }
      />

      <AccountSecurityCard />

      {/* General */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900">General</h2>
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <Field label="Page Title">
            <Input value={settings.page_title || ""} onChange={(e) => update("page_title", e.target.value)} />
          </Field>
          <Field label="Page URL">
            <Input
              value={settings.page_url || ""}
              onChange={(e) => update("page_url", e.target.value)}
              placeholder="https://status.example.com"
            />
          </Field>
          <Field label="Logo URL">
            <Input value={settings.logo_url || ""} onChange={(e) => update("logo_url", e.target.value)} />
          </Field>
          <Field label="Favicon URL">
            <Input value={settings.favicon_url || ""} onChange={(e) => update("favicon_url", e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Page Description">
              <Textarea
                rows={2}
                value={settings.page_description || ""}
                onChange={(e) => update("page_description", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* Localization */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900">Localization</h2>
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <Field label="Timezone">
            <Select value={settings.timezone || "UTC"} onChange={(e) => update("timezone", e.target.value)}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date Format">
            <Input value={settings.date_format || ""} onChange={(e) => update("date_format", e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Automation */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900">Automation</h2>
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <Field label="Auto-Resolve After (hours)">
            <Input
              type="number"
              value={settings.auto_resolve_hours || "4"}
              onChange={(e) => update("auto_resolve_hours", e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
          <Toggle
            label="Notify on incident create"
            checked={settings.notify_on_create === "1"}
            onChange={(v) => update("notify_on_create", v ? "1" : "0")}
          />
          <Toggle
            label="Notify on incident update"
            checked={settings.notify_on_update === "1"}
            onChange={(v) => update("notify_on_update", v ? "1" : "0")}
          />
          <Toggle
            label="Notify on resolve"
            checked={settings.notify_on_resolve === "1"}
            onChange={(v) => update("notify_on_resolve", v ? "1" : "0")}
          />
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900">Appearance</h2>
        <div className="mt-4 space-y-5">
          <Field label="Custom CSS">
            <Textarea rows={4} value={settings.custom_css || ""} onChange={(e) => update("custom_css", e.target.value)} />
          </Field>
          <Field label="Custom HTML (head)">
            <Textarea
              rows={2}
              value={settings.custom_html_head || ""}
              onChange={(e) => update("custom_html_head", e.target.value)}
            />
          </Field>
          <Field label="Custom HTML (footer)">
            <Textarea
              rows={2}
              value={settings.custom_html_footer || ""}
              onChange={(e) => update("custom_html_footer", e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {/* Public page security */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900">Public Page</h2>
        <div className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
          <Toggle
            label="Password protect public page"
            description="Require a password before viewing the status page"
            checked={settings.password_protect === "1"}
            onChange={(v) => update("password_protect", v ? "1" : "0")}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}

// ── Account & Security (HookForms Pro change-password pattern) ─────

function AccountSecurityCard() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordValid, setNewPasswordValid] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const user = session?.user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordValid) return;
    setSubmitting(true);
    setMessage(null);

    const { error } = await changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });

    setSubmitting(false);

    if (error) {
      setMessage({ tone: "error", text: error.message || "Current password is incorrect" });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setMessage({ tone: "success", text: "Password updated successfully" });
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-x-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Account & Security</h2>
          <p className="mt-0.5 text-sm/6 text-gray-500">
            Signed in as{" "}
            <span className="font-medium text-gray-700">{user?.email || "admin"}</span>
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            await signOut();
            navigate("/admin/login");
          }}
        >
          Sign out
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <PasswordField
          name="current_password"
          label="Current Password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <PasswordField
          name="new_password"
          label="New Password"
          placeholder="Min. 8 characters"
          required
          showStrength
          showConfirm
          confirmLabel="Confirm New Password"
          confirmPlaceholder="Re-enter your new password"
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
          onValidityChange={setNewPasswordValid}
        />

        {message && (
          <Alert tone={message.tone === "success" ? "success" : "error"}>{message.text}</Alert>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={!newPasswordValid || !currentPassword || submitting}>
            {submitting ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
