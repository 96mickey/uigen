// @vitest-environment node
import { test, expect, vi, afterEach } from "vitest";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const JWT_SECRET = new TextEncoder().encode("development-secret-key");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function setup() {
  const mockSet = vi.fn();
  vi.mocked(cookies).mockResolvedValue({ set: mockSet } as any);
  const { createSession } = await import("@/lib/auth");
  return { createSession, mockSet };
}

test("sets cookie with correct name", async () => {
  const { createSession, mockSet } = await setup();

  await createSession("user-1", "test@example.com");

  expect(mockSet).toHaveBeenCalledOnce();
  expect(mockSet.mock.calls[0][0]).toBe("auth-token");
});

test("sets cookie with correct options", async () => {
  const { createSession, mockSet } = await setup();

  await createSession("user-1", "test@example.com");

  const options = mockSet.mock.calls[0][2];
  expect(options.httpOnly).toBe(true);
  expect(options.secure).toBe(false); // NODE_ENV is "test", not "production"
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("emitted token is a valid JWT", async () => {
  const { createSession, mockSet } = await setup();

  await createSession("user-1", "test@example.com");

  const token = mockSet.mock.calls[0][1];
  await expect(jwtVerify(token, JWT_SECRET)).resolves.toBeDefined();
});

test("token payload contains userId and email", async () => {
  const { createSession, mockSet } = await setup();

  await createSession("user-42", "hello@example.com");

  const token = mockSet.mock.calls[0][1];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("hello@example.com");
});

test("cookie expiry is ~7 days from now", async () => {
  const { createSession, mockSet } = await setup();
  const before = Date.now();

  await createSession("user-1", "test@example.com");

  const options = mockSet.mock.calls[0][2];
  const expiresAt: Date = options.expires;
  const diff = expiresAt.getTime() - before;

  // Allow 1 second of tolerance
  expect(diff).toBeGreaterThanOrEqual(SEVEN_DAYS_MS - 1000);
  expect(diff).toBeLessThanOrEqual(SEVEN_DAYS_MS + 1000);
});
