import { test, expect, vi, beforeEach, describe } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

const anonWork = {
  messages: [{ id: "1", role: "user", content: "Hello" }],
  fileSystemData: { "/": { type: "directory" } },
};

const existingProject = {
  id: "proj-123",
  name: "My Project",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createdProject = {
  id: "proj-new",
  name: "New Design",
  userId: "user-1",
  messages: "[]",
  data: "{}",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue(createdProject);
});

describe("signIn", () => {
  test("returns the action result", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "password");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("redirects to existing project when user has projects and no anon work", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  test("creates a new project and redirects when user has no projects and no anon work", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue(createdProject);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith(`/${createdProject.id}`);
  });

  test("saves anon work as a new project and redirects when anon work exists", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    const savedProject = { ...createdProject, id: "proj-anon" };
    mockCreateProject.mockResolvedValue(savedProject);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.any(String),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(`/${savedProject.id}`);
    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  test("does not navigate when sign in fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  test("sets isLoading to true while signing in then false after", async () => {
    let resolveSignIn!: (value: any) => void;
    mockSignIn.mockReturnValue(new Promise((res) => { resolveSignIn = res; }));
    mockGetProjects.mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);

    let signInPromise: Promise<any>;
    act(() => {
      signInPromise = result.current.signIn("user@example.com", "password");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
      await signInPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false even when sign in throws", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.signIn("user@example.com", "password");
      } catch {
        // expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("ignores anon work when messages array is empty", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockGetProjects).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
  });

  test("redirects to most recent project (first in list)", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    const olderProject = { ...existingProject, id: "proj-old", updatedAt: new Date(0) };
    mockGetProjects.mockResolvedValue([existingProject, olderProject]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
  });
});

describe("signUp", () => {
  test("returns the action result", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("runs post-sign-in flow after successful sign up", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
  });

  test("saves anon work on sign up when anon work exists", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue(anonWork);
    const savedProject = { ...createdProject, id: "proj-signup-anon" };
    mockCreateProject.mockResolvedValue(savedProject);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalledWith({
      name: expect.any(String),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(`/${savedProject.id}`);
  });

  test("does not navigate when sign up fails", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;

    await act(async () => {
      returnValue = await result.current.signUp("existing@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("sets isLoading to true while signing up then false after", async () => {
    let resolveSignUp!: (value: any) => void;
    mockSignUp.mockReturnValue(new Promise((res) => { resolveSignUp = res; }));
    mockGetProjects.mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);

    let signUpPromise: Promise<any>;
    act(() => {
      signUpPromise = result.current.signUp("new@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: true });
      await signUpPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false even when sign up throws", async () => {
    mockSignUp.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.signUp("new@example.com", "password123");
      } catch {
        // expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });
});
