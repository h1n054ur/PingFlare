import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Paper, TextInput, PasswordInput, Button, Title, Text, Stack } from "@mantine/core";
import { adminLogin } from "../lib/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await adminLogin(email, password);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" py="xl">
      <Paper p="xl" withBorder radius="md">
        <Title order={3} ta="center" mb="lg">
          PingFlare Admin
        </Title>
        <form onSubmit={handleLogin}>
          <Stack gap="md">
            <TextInput
              label="Email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <PasswordInput
              label="Password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <Text c="red" size="sm">{error}</Text>}
            <Button type="submit" fullWidth loading={loading}>
              Sign In
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
