"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";

interface Driver {
  id: string;
  name: string;
  status: string;
  truckNumber: string;
}

interface Load {
  id: string;
  loadNumber: string;
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  pickupDate: string;
  estimatedMiles: number;
  rate: number;
  status: string;
}

interface AssignmentRow {
  id: string;
  status: string;
  requestedAt: string;
  respondedAt: string | null;
  expiresAt: string | null;
  declineReason: string | null;
  aiSummary: string | null;
  smsSent: boolean;
  webNotificationSent: boolean;
  driver: Driver;
  load: Load;
}

interface QueuePayload {
  assignments: AssignmentRow[];
  loads: Load[];
  aiSummary: string;
  groups: {
    unassigned: Load[];
    pending: AssignmentRow[];
    accepted: AssignmentRow[];
    declined: AssignmentRow[];
    reassignmentNeeded: Load[];
    completed: AssignmentRow[];
    expired: AssignmentRow[];
  };
}

const statusVariant: Record<string, "green" | "amber" | "red" | "blue" | "gray"> = {
  PENDING: "amber",
  ACCEPTED: "green",
  ASSIGNED: "green",
  DECLINED: "red",
  EXPIRED: "gray",
  REASSIGNED: "blue",
  COMPLETED: "blue",
};

export function AssignmentQueue({
  drivers,
  onToast,
}: {
  drivers: Driver[];
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const [queue, setQueue] = useState<QueuePayload | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [driverFilterId, setDriverFilterId] = useState("ALL");
  const [selectedLoadId, setSelectedLoadId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refreshQueue = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "ALL") params.set("status", status);
    if (driverFilterId !== "ALL") params.set("driverId", driverFilterId);
    const res = await fetch(`/api/assign?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load queue");
    const data = await res.json();
    setQueue(data);
  }, [driverFilterId, search, status]);

  useEffect(() => {
    refreshQueue().catch(() => onToast("Failed to load assignment queue", "error"));
  }, [refreshQueue, onToast]);

  const assignableLoads = useMemo(() => {
    if (!queue) return [];
    return [...queue.groups.unassigned, ...queue.groups.reassignmentNeeded];
  }, [queue]);

  const sendRequest = useCallback(async () => {
    if (!selectedLoadId || !selectedDriverId) {
      onToast("Select a load and driver first", "info");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loadId: selectedLoadId,
          driverId: selectedDriverId,
          aiScore: 85,
          aiReasoning: "Balanced recommendation using HOS, route fit, and margin.",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send request");
      }

      onToast("Assignment request sent with web and SMS notifications", "success");
      setSelectedLoadId("");
      setSelectedDriverId("");
      await refreshQueue();
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Send request failed", "error");
    } finally {
      setSubmitting(false);
    }
  }, [onToast, refreshQueue, selectedDriverId, selectedLoadId]);

  const sendReminder = useCallback(
    async (assignmentId: string) => {
      try {
        const res = await fetch("/api/assign/remind", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to send reminder");
        }
        onToast("Pending reminder sent via web and SMS", "success");
        await refreshQueue();
      } catch (err: unknown) {
        onToast(err instanceof Error ? err.message : "Reminder failed", "error");
      }
    },
    [onToast, refreshQueue]
  );

  const rows = queue?.assignments ?? [];

  return (
    <div className="grid gap-4">
      <section className="panel p-4">
        <p className="text-sm font-black text-white">AI Queue Summary</p>
        <p className="mt-2 text-sm leading-6 text-[#b8c8c0]">
          {queue?.aiSummary ?? "Loading queue intelligence..."}
        </p>
      </section>

      <section className="panel p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_240px_220px_240px_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search load ID, driver, route"
            className="rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2 text-sm text-white outline-none"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2 text-sm text-white"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="DECLINED">Declined</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <select
            value={driverFilterId}
            onChange={(event) => setDriverFilterId(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2 text-sm text-white"
          >
            <option value="ALL">All drivers</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
          <select
            value={selectedLoadId}
            onChange={(event) => setSelectedLoadId(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2 text-sm text-white"
          >
            <option value="">Select unassigned load</option>
            {assignableLoads.map((load) => (
              <option key={load.id} value={load.id}>
                {load.loadNumber} ({load.originCity} to {load.destCity})
              </option>
            ))}
          </select>
          <select
            value={selectedDriverId}
            onChange={(event) => setSelectedDriverId(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2 text-sm text-white"
          >
            <option value="">Select driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name} ({driver.status})
              </option>
            ))}
          </select>
          <button
            onClick={sendRequest}
            disabled={submitting}
            className="rounded-lg bg-[#26d69b] px-4 py-2 text-sm font-black text-[#03120c] disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send Assignment Request"}
          </button>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#111a16] text-[#8ea198]">
              <tr>
                <th className="px-4 py-3">Load</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pending Timer</th>
                <th className="px-4 py-3">Decline Reason</th>
                <th className="px-4 py-3">Notifications</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pendingMinutes = row.status === "PENDING"
                  ? Math.max(0, Math.floor((Date.now() - new Date(row.requestedAt).getTime()) / 60000))
                  : null;
                return (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{row.load.loadNumber}</div>
                      <div className="text-xs text-[#8ea198]">
                        {row.load.originCity}, {row.load.originState} to {row.load.destCity}, {row.load.destState}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#b8c8c0]">{row.driver.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[row.status] ?? "gray"}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#b8c8c0]">
                      {pendingMinutes === null ? "-" : `${pendingMinutes}m`}
                    </td>
                    <td className="px-4 py-3 text-[#b8c8c0]">{row.declineReason ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={row.webNotificationSent ? "green" : "gray"}>Web</Badge>
                        <Badge variant={row.smsSent ? "green" : "gray"}>SMS</Badge>
                        {row.status === "PENDING" ? (
                          <button
                            onClick={() => sendReminder(row.id)}
                            className="rounded-md border border-white/10 bg-[#111a16] px-2 py-1 text-[11px] font-black text-white"
                          >
                            Remind
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#8ea198]">
                    No assignment queue entries match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <QueueCard title="Unassigned Loads" count={queue?.groups.unassigned.length ?? 0} />
        <QueueCard title="Pending Driver Responses" count={queue?.groups.pending.length ?? 0} />
        <QueueCard title="Accepted Assignments" count={queue?.groups.accepted.length ?? 0} />
        <QueueCard title="Declined Assignments" count={queue?.groups.declined.length ?? 0} />
        <QueueCard title="Reassignment Needed" count={queue?.groups.reassignmentNeeded.length ?? 0} />
        <QueueCard title="Completed Trips" count={queue?.groups.completed.length ?? 0} />
      </section>
    </div>
  );
}

function QueueCard({ title, count }: { title: string; count: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1210] p-4">
      <p className="text-xs font-black uppercase text-[#8ea198]">{title}</p>
      <p className="mono mt-2 text-3xl font-black text-white">{count}</p>
    </div>
  );
}
