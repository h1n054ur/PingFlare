import { useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { AppShell, Group, Stack, Text, UnstyledButton, Box, ThemeIcon } from "@mantine/core";
import {
  IconDashboard,
  IconActivity,
  IconPackages,
  IconAlertTriangle,
  IconCalendar,
  IconUsers,
  IconBell,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { useAuth, adminLogout } from "../lib/api";

const navItems = [
  { label: "Overview", path: "/admin", icon: IconDashboard },
  { label: "Monitors", path: "/admin/monitors", icon: IconActivity },
  { label: "Components", path: "/admin/components", icon: IconPackages },
  { label: "Incidents", path: "/admin/incidents", icon: IconAlertTriangle },
  { label: "Maintenance", path: "/admin/maintenance", icon: IconCalendar },
  { label: "Subscribers", path: "/admin/subscribers", icon: IconUsers },
  { label: "Notifications", path: "/admin/notifications", icon: IconBell },
  { label: "Settings", path: "/admin/settings", icon: IconSettings },
];

export default function AdminLayout() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/admin/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: "sm" }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Text fw={700} size="lg">PingFlare</Text>
          <Text size="sm" c="dimmed">Admin Dashboard</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "6px",
                color: isActive ? "var(--mantine-color-blue-6)" : "var(--mantine-color-gray-6)",
                background: isActive ? "var(--mantine-color-blue-0)" : "transparent",
                textDecoration: "none",
              })}
            >
              <ThemeIcon variant="subtle" size="sm">
                <item.icon size={16} />
              </ThemeIcon>
              <Text size="sm">{item.label}</Text>
            </NavLink>
          ))}

          <Box mt="auto" pt="md">
            <UnstyledButton
              onClick={() => {
                adminLogout();
                navigate("/admin/login");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "6px",
                width: "100%",
                color: "var(--mantine-color-red-6)",
              }}
            >
              <IconLogout size={16} />
              <Text size="sm">Logout</Text>
            </UnstyledButton>
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
