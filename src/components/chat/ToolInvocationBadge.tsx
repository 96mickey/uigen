"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

function getFileName(path: unknown): string | null {
  if (typeof path !== "string" || !path) return null;
  return path.split("/").pop() ?? path;
}

export function getLabel(toolName: string, args: Record<string, unknown>): string {
  const fileName = getFileName(args.path);

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return fileName ? `Creating ${fileName}` : "Creating file";
      case "str_replace":
      case "insert":
        return fileName ? `Editing ${fileName}` : "Editing file";
      case "view":
        return fileName ? `Reading ${fileName}` : "Reading file";
      case "undo_edit":
        return fileName ? `Reverting ${fileName}` : "Reverting file";
      default:
        return fileName ? `Updating ${fileName}` : "Updating file";
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "delete":
        return fileName ? `Deleting ${fileName}` : "Deleting file";
      case "rename": {
        const newFileName = getFileName(args.new_path);
        return newFileName ? `Renaming to ${newFileName}` : "Renaming file";
      }
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const done = toolInvocation.state === "result";
  const args = ((toolInvocation as { args?: unknown }).args ?? {}) as Record<string, unknown>;
  const label = getLabel(toolInvocation.toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {done ? (
        <div
          className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"
          data-testid="status-done"
        />
      ) : (
        <Loader2
          className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0"
          data-testid="status-loading"
        />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
