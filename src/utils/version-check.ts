import { execSync } from "node:child_process";

import * as p from "@clack/prompts";

import { t } from "../i18n/index.js";
import { InstallMethod, PackageManager } from "./constants.js";
import { detectInstallMethod } from "./install-detection.js";
import { getPackageVersion } from "./paths.js";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/ccpoke/latest";
const VERSION_CHECK_TIMEOUT_MS = 5_000;

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
}

function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.split(".").map(Number);
  const latestParts = latest.split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] ?? 0;
    const l = latestParts[i] ?? 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  return false;
}

function getUpdateCommand(): string {
  const method = detectInstallMethod();
  switch (method) {
    case InstallMethod.Npx:
      return "npx -y ccpoke@latest";
    case InstallMethod.GitClone:
      return "git pull && npm run build";
    case InstallMethod.Global:
      return "ccpoke update";
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERSION_CHECK_TIMEOUT_MS);

    const response = await fetch(NPM_REGISTRY_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

export async function fetchUpdateInfo(): Promise<UpdateInfo | null> {
  const currentVersion = getPackageVersion();
  if (currentVersion === "unknown") return null;

  const latestVersion = await fetchLatestVersion();
  if (!latestVersion) return null;

  if (isNewerVersion(currentVersion, latestVersion)) {
    return { currentVersion, latestVersion };
  }

  return null;
}

function detectGlobalPackageManager(): PackageManager {
  const scriptPath = process.argv[1] ?? "";

  if (scriptPath.includes(PackageManager.Pnpm)) return PackageManager.Pnpm;
  if (scriptPath.includes(PackageManager.Yarn)) return PackageManager.Yarn;
  if (scriptPath.includes(PackageManager.Bun)) return PackageManager.Bun;
  return PackageManager.Npm;
}

function runUpdateInline(): boolean {
  const method = detectInstallMethod();

  if (method === InstallMethod.Npx) return true;

  if (method === InstallMethod.Global) {
    const pm = detectGlobalPackageManager();
    const pkg = "ccpoke";
    const cmd =
      pm === PackageManager.Yarn ? `yarn global add ${pkg}` : `${pm} install -g ${pkg}@latest`;

    try {
      execSync(cmd, { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export async function promptUpdateOrContinue(info: UpdateInfo): Promise<void> {
  const updateLabel = `${t("versionCheck.updatePrompt", { latest: info.latestVersion })} (v${info.currentVersion} → v${info.latestVersion})`;
  const continueLabel = t("versionCheck.continueWithoutUpdate", {
    current: info.currentVersion,
  });

  const result = await p.select({
    message: t("versionCheck.updateAvailable", {
      current: info.currentVersion,
      latest: info.latestVersion,
    }),
    options: [
      { value: "update", label: updateLabel },
      { value: "continue", label: continueLabel },
    ],
  });

  if (p.isCancel(result) || result === "continue") return;

  const s = p.spinner();
  s.start(t("versionCheck.runToUpdate", { command: getUpdateCommand() }));

  const success = runUpdateInline();

  if (success) {
    s.stop(`✅ v${info.currentVersion} → v${info.latestVersion}`);
    p.log.info(t("versionCheck.runToUpdate", { command: getUpdateCommand() }));
    process.exit(0);
  } else {
    s.stop("❌");
    p.log.warn(t("versionCheck.runToUpdate", { command: getUpdateCommand() }));
  }
}

export async function checkForUpdates(): Promise<void> {
  const info = await fetchUpdateInfo();
  if (!info) return;
  await promptUpdateOrContinue(info);
}
