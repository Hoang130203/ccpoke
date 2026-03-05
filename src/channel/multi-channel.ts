import type {
  AskUserQuestionEvent,
  NotificationEvent,
  PermissionRequestEvent,
} from "../agent/agent-handler.js";
import { logError } from "../utils/log.js";
import type { NotificationChannel, NotificationData } from "./types.js";

export class MultiChannel implements NotificationChannel {
  constructor(private channels: NotificationChannel[]) {}

  async initialize(): Promise<void> {
    const results = await Promise.allSettled(this.channels.map((c) => c.initialize()));
    for (const r of results) {
      if (r.status === "rejected") logError("[MultiChannel] channel init failed", r.reason);
    }
  }

  async shutdown(): Promise<void> {
    await Promise.allSettled(this.channels.map((c) => c.shutdown()));
  }

  async sendNotification(data: NotificationData, responseUrl?: string): Promise<void> {
    await Promise.allSettled(this.channels.map((c) => c.sendNotification(data, responseUrl)));
  }

  handleNotificationEvent(event: NotificationEvent): void {
    for (const c of this.channels) c.handleNotificationEvent(event);
  }

  handleAskUserQuestionEvent(event: AskUserQuestionEvent): void {
    for (const c of this.channels) c.handleAskUserQuestionEvent(event);
  }

  handlePermissionRequestEvent(event: PermissionRequestEvent): void {
    for (const c of this.channels) c.handlePermissionRequestEvent(event);
  }
}
