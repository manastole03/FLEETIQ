import { prisma } from "@/lib/prisma";
import { analyzeCost } from "@/lib/grok";
import { haversineDistance } from "@/lib/truckerpath";
import { buildAssignmentNotificationText, buildAssignmentSummary, buildQueueSummary } from "@/lib/ai-operations";
import { createWebNotification } from "@/lib/notification-service";
import { sendAssignmentSms } from "@/lib/sms";
import { findDriverSessionUserIdByTruckNumber } from "@/lib/demo-auth";
import type { Prisma } from "@prisma/client";

const DEFAULT_EXPIRY_MINUTES = 45;

export async function createAssignmentRequest(input: {
  driverId: string;
  loadId: string;
  assignedBy?: string;
  aiScore: number;
  aiReasoning?: string;
  fuelPrice?: number;
  driverPayPerHour?: number;
  reassignedFromId?: string;
}) {
  const [driver, load] = await Promise.all([
    prisma.driver.findUnique({ where: { id: input.driverId } }),
    prisma.load.findUnique({ where: { id: input.loadId } }),
  ]);

  if (!driver) throw new Error("Driver not found");
  if (!load) throw new Error("Load not found");

  let reassignedFromId = input.reassignedFromId;
  if (!reassignedFromId && load.status === "REASSIGNMENT_NEEDED") {
    const previous = await prisma.assignment.findFirst({
      where: { loadId: load.id, status: "DECLINED" },
      orderBy: { respondedAt: "desc" },
    });
    if (previous) {
      reassignedFromId = previous.id;
      await prisma.assignment.update({
        where: { id: previous.id },
        data: { status: "REASSIGNED" },
      });
    }
  }

  const activeAssignment = await prisma.assignment.findFirst({
    where: {
      loadId: load.id,
      status: { in: ["PENDING", "ACCEPTED", "ASSIGNED", "IN_TRANSIT"] },
    },
  });
  if (activeAssignment) {
    throw new Error("Load already has an active assignment request");
  }

  const deadMiles = Math.round(
    haversineDistance(
      driver.latitude ?? 0,
      driver.longitude ?? 0,
      load.originLat,
      load.originLng
    )
  );

  const cost = await analyzeCost({
    rate: load.rate,
    loadedMiles: load.estimatedMiles,
    deadMiles,
    fuelPrice: input.fuelPrice ?? 4.2,
    driverPayPerHour: input.driverPayPerHour ?? 28,
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_MINUTES * 60 * 1000);

  const assignment = await prisma.assignment.create({
    data: {
      driverId: driver.id,
      loadId: load.id,
      assignedBy: input.assignedBy,
      status: "PENDING",
      aiScore: input.aiScore,
      aiReasoning: input.aiReasoning ?? null,
      aiSummary: buildAssignmentSummary({
        load,
        driver,
        assignment: { status: "PENDING", requestedAt: now, expiresAt },
      }),
      estimatedRevenue: cost.revenue,
      estimatedFuelCost: cost.fuelCost,
      estimatedDeadMiles: deadMiles,
      estimatedDeadCost: cost.deadheadFuelCost,
      estimatedDriverPay: cost.driverPay,
      estimatedTolls: cost.tolls,
      estimatedNetMargin: cost.netMargin,
      marginPercent: cost.marginPercent,
      requestedAt: now,
      expiresAt,
      reassignedFromId,
      smsSent: false,
      webNotificationSent: false,
    },
    include: {
      driver: true,
      load: true,
    },
  });

  await prisma.load.update({
    where: { id: load.id },
    data: { status: "PENDING_RESPONSE" },
  });

  const webMsg = buildAssignmentNotificationText({
    load,
    event: reassignedFromId ? "reassigned" : "request",
    driverName: driver.name,
  });

  await createWebNotification({
    userId: findDriverSessionUserIdByTruckNumber(driver.truckNumber) ?? driver.id,
    type: "ASSIGNMENT_REQUEST",
    title: "New assignment request from dispatcher",
    message: webMsg,
    assignmentId: assignment.id,
    loadId: load.id,
    driverId: driver.id,
    priority: "high",
  });

  const smsResult = await sendAssignmentSms({
    to: driver.phone,
    body: webMsg,
    assignmentId: assignment.id,
    eventType: "ASSIGNMENT_REQUEST",
  });

  await prisma.smsLog.create({
    data: {
      toNumber: smsResult.to,
      message: webMsg,
      provider: smsResult.provider,
      providerId: smsResult.providerId,
      status: smsResult.success ? "SENT" : "FAILED",
      assignmentId: assignment.id,
      eventType: "ASSIGNMENT_REQUEST",
      error: smsResult.error,
      sentAt: smsResult.success ? new Date() : null,
    },
  });

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      smsSent: smsResult.success,
      webNotificationSent: true,
    },
  });

  return { assignment, cost, smsResult };
}

export async function respondToAssignment(input: {
  assignmentId: string;
  driverId: string;
  response: "ACCEPTED" | "DECLINED";
  reason?: string;
}) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: input.assignmentId },
    include: { driver: true, load: true },
  });

  if (!assignment) throw new Error("Assignment not found");
  if (assignment.driverId !== input.driverId) throw new Error("Unauthorized response");
  if (assignment.status !== "PENDING") throw new Error("Assignment is no longer pending");

  const respondedAt = new Date();

  await prisma.$transaction([
    prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        status: input.response,
        respondedAt,
        declineReason: input.response === "DECLINED" ? input.reason ?? null : null,
        startedAt: input.response === "ACCEPTED" ? respondedAt : null,
      },
    }),
    prisma.driverResponse.create({
      data: {
        assignmentId: assignment.id,
        driverId: assignment.driverId,
        response: input.response,
        reason: input.reason,
      },
    }),
    prisma.load.update({
      where: { id: assignment.loadId },
      data: {
        status: input.response === "ACCEPTED" ? "ASSIGNED" : "REASSIGNMENT_NEEDED",
      },
    }),
    prisma.driver.update({
      where: { id: assignment.driverId },
      data: { status: input.response === "ACCEPTED" ? "ON_TRIP" : "AVAILABLE" },
    }),
  ]);

  const event = input.response === "ACCEPTED" ? "accepted" : "declined";
  const msg = buildAssignmentNotificationText({
    load: assignment.load,
    event,
    driverName: assignment.driver.name,
    reason: input.reason,
  });

  await createWebNotification({
    userId: assignment.assignedBy ?? "admin-dispatcher",
    type: input.response === "ACCEPTED" ? "ASSIGNMENT_ACCEPTED" : "ASSIGNMENT_DECLINED",
    title:
      input.response === "ACCEPTED"
        ? "Driver accepted assignment"
        : "Driver declined assignment",
    message: msg,
    assignmentId: assignment.id,
    loadId: assignment.loadId,
    driverId: assignment.driverId,
    priority: input.response === "DECLINED" ? "high" : "normal",
  });

  const smsResult = await sendAssignmentSms({
    to: assignment.driver.phone,
    body: msg,
    assignmentId: assignment.id,
    eventType:
      input.response === "ACCEPTED"
        ? "ASSIGNMENT_ACCEPTED"
        : "ASSIGNMENT_DECLINED",
  });

  await prisma.smsLog.create({
    data: {
      toNumber: smsResult.to,
      message: msg,
      provider: smsResult.provider,
      providerId: smsResult.providerId,
      status: smsResult.success ? "SENT" : "FAILED",
      assignmentId: assignment.id,
      eventType:
        input.response === "ACCEPTED"
          ? "ASSIGNMENT_ACCEPTED"
          : "ASSIGNMENT_DECLINED",
      error: smsResult.error,
      sentAt: smsResult.success ? new Date() : null,
    },
  });

  return { success: true };
}

export async function expirePendingAssignments() {
  const now = new Date();
  const pending = await prisma.assignment.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    include: { load: true },
  });

  if (!pending.length) return 0;

  for (const assignment of pending) {
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: "EXPIRED", respondedAt: now },
    });
    await prisma.load.update({
      where: { id: assignment.loadId },
      data: { status: "REASSIGNMENT_NEEDED" },
    });
  }

  return pending.length;
}

export async function sendPendingReminder(assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { driver: true, load: true },
  });

  if (!assignment) throw new Error("Assignment not found");
  if (assignment.status !== "PENDING") throw new Error("Only pending assignments can be reminded");

  const message = buildAssignmentNotificationText({
    load: assignment.load,
    event: "reminder",
    driverName: assignment.driver.name,
  });

  await createWebNotification({
    userId: findDriverSessionUserIdByTruckNumber(assignment.driver.truckNumber) ?? assignment.driverId,
    type: "ASSIGNMENT_PENDING_REMINDER",
    title: "Assignment reminder",
    message,
    assignmentId: assignment.id,
    loadId: assignment.loadId,
    driverId: assignment.driverId,
    priority: "high",
  });

  const smsResult = await sendAssignmentSms({
    to: assignment.driver.phone,
    body: message,
    assignmentId: assignment.id,
    eventType: "ASSIGNMENT_PENDING_REMINDER",
  });

  await prisma.smsLog.create({
    data: {
      toNumber: smsResult.to,
      message,
      provider: smsResult.provider,
      providerId: smsResult.providerId,
      status: smsResult.success ? "SENT" : "FAILED",
      assignmentId: assignment.id,
      eventType: "ASSIGNMENT_PENDING_REMINDER",
      error: smsResult.error,
      sentAt: smsResult.success ? new Date() : null,
    },
  });

  return { success: true, smsResult };
}

export async function getAssignmentQueue(filters: {
  status?: string;
  search?: string;
  driverId?: string;
}) {
  await expirePendingAssignments();

  const where: Prisma.AssignmentWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.driverId ? { driverId: filters.driverId } : {}),
    ...(filters.search
      ? {
          OR: [
            { load: { loadNumber: { contains: filters.search } } },
            { driver: { name: { contains: filters.search } } },
          ],
        }
      : {}),
  };

  const [assignments, loads] = await Promise.all([
    prisma.assignment.findMany({
      where,
      include: {
        driver: true,
        load: true,
      },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.load.findMany({
      where: {
        status: { in: ["PENDING", "REASSIGNMENT_NEEDED"] },
      },
      orderBy: { pickupDate: "asc" },
    }),
  ]);

  const now = Date.now();
  const pending = assignments.filter((item) => item.status === "PENDING");
  const declined = assignments.filter((item) => item.status === "DECLINED");
  const reassignmentNeeded = loads.filter((item) => item.status === "REASSIGNMENT_NEEDED");

  const oldestPendingMinutes = pending
    .map((item) => Math.floor((now - new Date(item.requestedAt).getTime()) / 60000))
    .sort((a, b) => b - a)[0];

  const topBackupDriver = assignments
    .filter((item) => item.status === "DECLINED")
    .sort((a, b) => b.aiScore - a.aiScore)[0]?.driver.name;

  const aiSummary = buildQueueSummary({
    pendingCount: pending.length,
    declinedCount: declined.length,
    reassignmentNeededCount: reassignmentNeeded.length,
    topBackupDriver,
    oldestPendingMinutes,
  });

  return {
    assignments,
    loads,
    aiSummary,
    groups: {
      unassigned: loads.filter((load) => load.status === "PENDING"),
      pending,
      accepted: assignments.filter((item) => item.status === "ACCEPTED" || item.status === "ASSIGNED"),
      declined,
      reassignmentNeeded,
      completed: assignments.filter((item) => item.status === "COMPLETED"),
      expired: assignments.filter((item) => item.status === "EXPIRED"),
    },
  };
}
