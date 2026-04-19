"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ToastContainer, useToast } from "@/components/ui/Toast";

interface AssignmentEntry {
  id: string;
  status: string;
  requestedAt: string;
  respondedAt: string | null;
  expiresAt: string | null;
  declineReason: string | null;
  aiSummary: string | null;
  smsSent: boolean;
  webNotificationSent: boolean;
  load: {
    loadNumber: string;
    originCity: string;
    originState: string;
    destCity: string;
    destState: string;
    pickupDate: string;
    estimatedMiles: number;
    rate: number;
  };
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  priority: string;
  createdAt: string;
}

export function DriverAssignmentCenter() {
  const [pending, setPending] = useState<AssignmentEntry[]>([]);
  const [active, setActive] = useState<AssignmentEntry[]>([]);
  const [declined, setDeclined] = useState<AssignmentEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const { toasts, addToast, dismiss } = useToast();

  const refresh = useCallback(async () => {
    const [assignmentRes, notifRes] = await Promise.all([
      fetch("/api/driver/assignments"),
      fetch("/api/notifications"),
    ]);

    if (!assignmentRes.ok) throw new Error("Unable to load driver assignments");
    const assignmentData = await assignmentRes.json();
    setPending(assignmentData.pending ?? []);
    setActive(assignmentData.active ?? []);
    setDeclined(assignmentData.declined ?? []);

    if (notifRes.ok) {
      const notifData = await notifRes.json();
      setNotifications(notifData.notifications ?? []);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => addToast("Unable to load assignment center", "error"));
  }, [addToast, refresh]);

  const respond = useCallback(
    async (assignmentId: string, response: "ACCEPTED" | "DECLINED") => {
      setBusyId(assignmentId);
      try {
        const res = await fetch("/api/assign/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentId,
            response,
            reason: response === "DECLINED" ? declineReason : undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Unable to submit response");
        }

        addToast(
          response === "ACCEPTED"
            ? "Assignment accepted and admin notified"
            : "Assignment declined and admin notified",
          "success"
        );
        setDeclineReason("");
        await refresh();
      } catch (err: unknown) {
        addToast(err instanceof Error ? err.message : "Action failed", "error");
      } finally {
        setBusyId(null);
      }
    },
    [addToast, declineReason, refresh]
  );

  const unreadCount = notifications.filter((item) => item.status === "UNREAD").length;

  return (
    <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_380px]">
      <div className="grid gap-4">
        <Panel title="Pending Assignment Requests" badge={`${pending.length}`}>
          {pending.length ? (
            pending.map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-[#0d1210] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-white">{item.load.loadNumber}</p>
                    <p className="text-xs text-[#8ea198]">
                      {item.load.originCity}, {item.load.originState} to {item.load.destCity}, {item.load.destState}
                    </p>
                  </div>
                  <Badge variant="amber">Pending</Badge>
                </div>

                <div className="mt-3 grid gap-1 text-xs text-[#b8c8c0]">
                  <p>Pickup: {new Date(item.load.pickupDate).toLocaleString()}</p>
                  <p>Miles: {Math.round(item.load.estimatedMiles)}</p>
                  <p>Payout: ${Math.round(item.load.rate).toLocaleString()}</p>
                  <p>Expires: {item.expiresAt ? new Date(item.expiresAt).toLocaleTimeString() : "N/A"}</p>
                </div>

                {item.aiSummary ? (
                  <p className="mt-3 rounded-lg border border-[#26d69b]/20 bg-[#07100d] p-3 text-xs leading-5 text-[#b8c8c0]">
                    {item.aiSummary}
                  </p>
                ) : null}

                <label className="mt-3 block text-xs text-[#8ea198]">Decline reason (optional)</label>
                <input
                  value={declineReason}
                  onChange={(event) => setDeclineReason(event.target.value)}
                  placeholder="Example: HOS too low for this route"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#070908] px-3 py-2 text-sm text-white outline-none"
                />

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => respond(item.id, "ACCEPTED")}
                    disabled={busyId === item.id}
                    className="rounded-lg bg-[#26d69b] px-3 py-2 text-sm font-black text-[#03120c] disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respond(item.id, "DECLINED")}
                    disabled={busyId === item.id}
                    className="rounded-lg border border-white/10 bg-[#111a16] px-3 py-2 text-sm font-black text-white disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>

                <div className="mt-3 flex gap-2 text-xs">
                  <Badge variant={item.webNotificationSent ? "green" : "gray"}>Web Notification</Badge>
                  <Badge variant={item.smsSent ? "green" : "gray"}>SMS Sent</Badge>
                </div>
              </article>
            ))
          ) : (
            <Empty text="No pending requests right now." />
          )}
        </Panel>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Active Assigned Trips" badge={`${active.length}`}>
            {active.length ? (
              active.map((item) => (
                <article key={item.id} className="rounded-lg border border-white/10 bg-[#0d1210] p-3">
                  <p className="text-sm font-black text-white">{item.load.loadNumber}</p>
                  <p className="text-xs text-[#8ea198]">{item.load.originCity} to {item.load.destCity}</p>
                  <div className="mt-2"><Badge variant="green">{item.status}</Badge></div>
                </article>
              ))
            ) : (
              <Empty text="No active trips yet." />
            )}
          </Panel>

          <Panel title="Declined / Past Requests" badge={`${declined.length}`}>
            {declined.length ? (
              declined.map((item) => (
                <article key={item.id} className="rounded-lg border border-white/10 bg-[#0d1210] p-3">
                  <p className="text-sm font-black text-white">{item.load.loadNumber}</p>
                  <p className="text-xs text-[#8ea198]">{item.load.originCity} to {item.load.destCity}</p>
                  <p className="mt-2 text-xs text-[#b8c8c0]">Reason: {item.declineReason ?? "N/A"}</p>
                  <div className="mt-2"><Badge variant="red">{item.status}</Badge></div>
                </article>
              ))
            ) : (
              <Empty text="No declined requests yet." />
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Notifications Center" badge={`${unreadCount} unread`}>
        {notifications.length ? (
          <div className="grid gap-3">
            {notifications.map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-[#0d1210] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-white">{item.title}</p>
                  <Badge variant={item.status === "UNREAD" ? "blue" : "gray"}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#b8c8c0]">{item.message}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="gray">{item.type.toLowerCase()}</Badge>
                  <Badge variant={item.priority === "high" ? "red" : "gray"}>{item.priority}</Badge>
                  <span className="text-[11px] text-[#8ea198]">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="No notifications yet." />
        )}
      </Panel>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </section>
  );
}

function Panel({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-black text-white">{title}</p>
        {badge ? <Badge variant="blue">{badge}</Badge> : null}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-white/10 bg-[#0d1210] p-4 text-sm text-[#8ea198]">{text}</p>;
}
