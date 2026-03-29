import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge, getLabel } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// --- getLabel unit tests ---

test("getLabel: str_replace_editor create with path", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "src/components/Card.jsx" })).toBe("Creating Card.jsx");
});

test("getLabel: str_replace_editor str_replace with path", () => {
  expect(getLabel("str_replace_editor", { command: "str_replace", path: "src/App.jsx" })).toBe("Editing App.jsx");
});

test("getLabel: str_replace_editor insert with path", () => {
  expect(getLabel("str_replace_editor", { command: "insert", path: "src/App.jsx" })).toBe("Editing App.jsx");
});

test("getLabel: str_replace_editor view with path", () => {
  expect(getLabel("str_replace_editor", { command: "view", path: "src/index.jsx" })).toBe("Reading index.jsx");
});

test("getLabel: str_replace_editor undo_edit with path", () => {
  expect(getLabel("str_replace_editor", { command: "undo_edit", path: "src/App.jsx" })).toBe("Reverting App.jsx");
});

test("getLabel: str_replace_editor unknown command with path falls back to Updating", () => {
  expect(getLabel("str_replace_editor", { command: "unknown", path: "src/App.jsx" })).toBe("Updating App.jsx");
});

test("getLabel: str_replace_editor create without path", () => {
  expect(getLabel("str_replace_editor", { command: "create" })).toBe("Creating file");
});

test("getLabel: file_manager delete with path", () => {
  expect(getLabel("file_manager", { command: "delete", path: "src/Old.jsx" })).toBe("Deleting Old.jsx");
});

test("getLabel: file_manager rename with new_path", () => {
  expect(getLabel("file_manager", { command: "rename", path: "src/Old.jsx", new_path: "src/New.jsx" })).toBe("Renaming to New.jsx");
});

test("getLabel: file_manager rename without new_path", () => {
  expect(getLabel("file_manager", { command: "rename", path: "src/Old.jsx" })).toBe("Renaming file");
});

test("getLabel: unknown tool falls back to tool name", () => {
  expect(getLabel("some_other_tool", { command: "do_thing" })).toBe("some_other_tool");
});

test("getLabel: empty args", () => {
  expect(getLabel("str_replace_editor", {})).toBe("Updating file");
});

// --- ToolInvocationBadge render tests ---

test("shows label text for create command", () => {
  const invocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    state: "result",
    args: { command: "create", path: "src/Button.jsx" },
    result: "ok",
  } as ToolInvocation;

  render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(screen.getByText("Creating Button.jsx")).toBeDefined();
});

test("shows label text for str_replace command", () => {
  const invocation = {
    toolCallId: "2",
    toolName: "str_replace_editor",
    state: "result",
    args: { command: "str_replace", path: "src/App.jsx" },
    result: "ok",
  } as ToolInvocation;

  render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows label text for file_manager delete", () => {
  const invocation = {
    toolCallId: "3",
    toolName: "file_manager",
    state: "result",
    args: { command: "delete", path: "src/Old.jsx" },
    result: { success: true },
  } as ToolInvocation;

  render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(screen.getByText("Deleting Old.jsx")).toBeDefined();
});

test("shows done indicator when state is result", () => {
  const invocation = {
    toolCallId: "4",
    toolName: "str_replace_editor",
    state: "result",
    args: { command: "create", path: "src/Card.jsx" },
    result: "ok",
  } as ToolInvocation;

  render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(screen.getByTestId("status-done")).toBeDefined();
});

test("shows loading indicator when state is call", () => {
  const invocation = {
    toolCallId: "5",
    toolName: "str_replace_editor",
    state: "call",
    args: { command: "create", path: "src/Card.jsx" },
  } as ToolInvocation;

  render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(screen.getByTestId("status-loading")).toBeDefined();
});

test("shows loading indicator when state is partial-call", () => {
  const invocation = {
    toolCallId: "6",
    toolName: "str_replace_editor",
    state: "partial-call",
    args: {},
  } as ToolInvocation;

  render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(screen.getByTestId("status-loading")).toBeDefined();
});
