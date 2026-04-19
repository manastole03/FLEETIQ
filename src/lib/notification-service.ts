import { prisma } from "@/lib/prisma";

export interface WebNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  assignmentId?: string;
  loadId?: string;
  driverId?: string;
  priority?: "low" | "normal" | "high";
}

export async function createWebNotification(input: WebNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      assignmentId: input.assignmentId,
      loadId: input.loadId,
      driverId: input.driverId,
      channel: "web",
      status: "UNREAD",
      priority: input.priority ?? "normal",
    },
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });
}
