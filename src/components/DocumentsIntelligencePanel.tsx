"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileClock,
  ReceiptText,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  getDemoDocumentHistory,
  type DocumentSummary,
  type IntelligenceLoad,
} from "@/lib/intelligence";

interface DocumentsIntelligencePanelProps {
  loads: IntelligenceLoad[];
}

export function DocumentsIntelligencePanel({
  loads,
}: DocumentsIntelligencePanelProps) {
  const docs = useMemo(() => getDemoDocumentHistory(loads), [loads]);
  const pending = loads
    .filter((load) => load.status === "PENDING" || load.status === "ASSIGNED")
    .slice(0, 3);

  return (
    <div className="fade-in grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
      <aside className="panel p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#14362a] text-[#26d69b]">
            <FileCheck2 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-black text-white">Document Intelligence</p>
            <p className="mt-1 text-xs text-[#8ea198]">
              BOL, POD, receipt readiness, and AI summaries.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <DocMetric label="Uploaded docs" value={docs.length} />
          <DocMetric
            label="Ready for billing"
            value={docs.filter((doc) => doc.readyForBilling).length}
          />
          <DocMetric label="Pending packets" value={pending.length} warning />
        </div>

        <div className="mt-5 rounded-lg border border-[#f4b84a]/25 bg-[#211b10] p-4">
          <div className="flex items-start gap-3">
            <FileClock className="mt-0.5 h-5 w-5 text-[#f4b84a]" />
            <div>
              <p className="text-sm font-black text-white">Smart reminders</p>
              <p className="mt-2 text-sm leading-6 text-[#b8c8c0]">
                Drivers are reminded after pickup for BOL, after refueling for
                fuel receipts, and after delivery for POD.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section className="grid gap-4">
        <div className="panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-white">
                Uploaded Document Summaries
              </p>
              <p className="mt-1 text-xs text-[#8ea198]">
                Structured extraction is shown for dispatcher billing review.
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#070908] px-3 py-2 text-sm text-[#8ea198]">
              <Search className="h-4 w-4" />
              Search load or document
            </label>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {docs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">Pending Checklist</p>
              <p className="mt-1 text-xs text-[#8ea198]">
                Loads with documents still expected from the driver workflow.
              </p>
            </div>
            <Badge variant="amber">{pending.length} packets</Badge>
          </div>

          <div className="mt-4 grid gap-3">
            {pending.map((load, index) => (
              <div
                key={load.id}
                className="rounded-lg border border-white/10 bg-[#0d1210] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="mono text-xs font-black text-[#8ea198]">
                      {load.loadNumber}
                    </p>
                    <p className="mt-1 font-black text-white">
                      {load.originCity} to {load.destCity}
                    </p>
                  </div>
                  <Badge variant={index === 0 ? "amber" : "gray"}>
                    {index === 0 ? "BOL pending" : "Awaiting driver docs"}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <ChecklistItem label="BOL" complete={index > 0} />
                  <ChecklistItem label="Fuel receipt" complete={index === 2} />
                  <ChecklistItem label="POD" complete={false} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function DocumentCard({ doc }: { doc: DocumentSummary }) {
  return (
    <article className="rounded-lg border border-white/10 bg-[#0d1210] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#111a16] text-[#26d69b]">
            {doc.type === "fuelReceipt" ? (
              <ReceiptText className="h-5 w-5" />
            ) : (
              <ClipboardList className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="font-black text-white">{doc.label}</p>
            <p className="mono mt-1 text-xs text-[#8ea198]">
              {doc.linkedLoad} / {formatDate(doc.uploadedAt)}
            </p>
          </div>
        </div>
        <Badge variant={doc.readyForBilling ? "green" : "amber"}>
          {doc.readyForBilling ? "Billing ready" : "Trip packet"}
        </Badge>
      </div>

      <div className="mt-4 rounded-lg border border-[#26d69b]/20 bg-[#07100d] p-3">
        <p className="text-xs font-black uppercase text-[#8ea198]">AI Summary</p>
        <p className="mt-2 text-sm leading-6 text-[#b8c8c0]">{doc.aiSummary}</p>
      </div>

      <div className="mt-4 grid gap-2">
        {doc.extracted.map((field) => (
          <div
            key={`${doc.id}-${field.label}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#070908] px-3 py-2"
          >
            <span className="text-xs font-black uppercase text-[#8ea198]">
              {field.label}
            </span>
            <span className="truncate text-sm font-black text-white">
              {field.value}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function DocMetric({
  label,
  value,
  warning,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1210] p-4">
      <p className="text-xs font-black uppercase text-[#8ea198]">{label}</p>
      <p
        className={`mono mt-2 text-3xl font-black ${
          warning ? "text-[#f4b84a]" : "text-[#26d69b]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ChecklistItem({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#070908] p-3">
      <CheckCircle2
        className={`h-4 w-4 ${complete ? "text-[#26d69b]" : "text-[#8ea198]"}`}
      />
      <span className="text-sm font-bold text-white">{label}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
