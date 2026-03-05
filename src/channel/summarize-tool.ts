export function summarizeTool(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Bash":
      return typeof input.command === "string" ? truncate(input.command, 120) : toolName;
    case "Edit":
    case "Write":
    case "Read":
    case "Glob":
    case "Grep":
      return typeof input.file_path === "string"
        ? input.file_path
        : typeof input.path === "string"
          ? input.path
          : typeof input.pattern === "string"
            ? input.pattern
            : toolName;
    case "Agent":
      return typeof input.description === "string" ? truncate(input.description, 80) : toolName;
    default:
      return toolName;
  }
}

export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 3) + "...";
}
