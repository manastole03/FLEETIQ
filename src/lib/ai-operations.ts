import type { Assignment, Driver, Load } from "@prisma/client";

export function buildAssignmentSummary(params: {
  load: Load;
  driver: Driver;
  assignment: Pick<Assignment, "status" | "requestedAt" | "expiresAt">;
}) {
  const { load, driver, assignment } = params;
  const pickup = new Date(load.pickupDate).toLocaleString();
  const expiry = assignment.expiresAt
    ? new Date(assignment.expiresAt).toLocaleString()
    : "no expiration";

  return `${load.loadNumber}: ${load.originCity}, ${load.originState} to ${load.destCity}, ${load.destState}. Pickup ${pickup}. Approx ${Math.round(load.estimatedMiles)} miles. Rate $${Math.round(load.rate).toLocaleString()}. Driver ${driver.name} must accept or decline before ${expiry}.`;
}

export function buildAssignmentNotificationText(params: {
  load: Load;
  event: "request" | "accepted" | "declined" | "reminder" | "reassigned";
  driverName: string;
  reason?: string | null;
}) {
  const { load, event, driverName, reason } = params;
  const route = `${load.originCity} to ${load.destCity}`;
  const pickup = new Date(load.pickupDate).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (event === "request") {
    return `You have a new load assignment request. Load ${load.loadNumber} from ${route}. Pickup at ${pickup}. Please log in to accept or decline.`;
  }
  if (event === "accepted") {
    return `${driverName} accepted assignment ${load.loadNumber} (${route}). Trip is now active.`;
  }
  if (event === "declined") {
    return `${driverName} declined assignment ${load.loadNumber}${reason ? `: ${reason}` : ""}. Reassignment is required.`;
  }
  if (event === "reassigned") {
    return `Load ${load.loadNumber} was reassigned. Please review the updated assignment request.`;
  }
  return `Reminder: assignment ${load.loadNumber} (${route}) is still pending driver action.`;
}

export function buildQueueSummary(params: {
  pendingCount: number;
  declinedCount: number;
  reassignmentNeededCount: number;
  topBackupDriver?: string;
  oldestPendingMinutes?: number;
}) {
  const { pendingCount, declinedCount, reassignmentNeededCount, topBackupDriver, oldestPendingMinutes } = params;
  const timeNote =
    oldestPendingMinutes && oldestPendingMinutes > 0
      ? ` Oldest pending request is ${oldestPendingMinutes} minutes old.`
      : "";

  const backup = topBackupDriver
    ? ` ${topBackupDriver} looks like the best backup for immediate reassignment.`
    : "";

  return `${pendingCount} loads are waiting for driver response. ${declinedCount} assignments were declined, and ${reassignmentNeededCount} need reassignment.${timeNote}${backup}`;
}
