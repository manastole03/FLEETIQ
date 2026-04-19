"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  buildCopilotResponse,
  type CopilotResponse,
  type IntelligenceDriver,
  type IntelligenceLoad,
} from "@/lib/intelligence";

interface DispatchCopilotProps {
  loads: IntelligenceLoad[];
  drivers: IntelligenceDriver[];
  alerts: Array<{ severity: string; title: string; message: string }>;
  onOpenProfitability: () => void;
  onOpenDispatch: () => void;
  onOpenAlerts: () => void;
}

interface ChatTurn {
  id: string;
  prompt: string;
  response: CopilotResponse;
}

const prompts = [
  "Who should take this load?",
  "Which assignments are pending too long?",
  "Which loads need reassignment?",
  "Which drivers declined recently?",
  "Which loads are most profitable today?",
  "Which drivers are ready right now?",
  "Which trips are at risk?",
  "Show me drivers near Dallas with enough HOS",
  "Which loads should I reject?",
];

export function DispatchCopilot({
  loads,
  drivers,
  alerts,
  onOpenProfitability,
  onOpenDispatch,
  onOpenAlerts,
}: DispatchCopilotProps) {
  const [input, setInput] = useState(prompts[0]);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => {
    const pendingLoads = loads.filter((load) => load.status === "PENDING").length;
    const readyDrivers = drivers.filter(
      (driver) => driver.status === "AVAILABLE" && driver.hosRemaining >= 6
    ).length;
    const riskCount =
      alerts.length + drivers.filter((driver) => driver.hosRemaining < 4).length;
    return { pendingLoads, readyDrivers, riskCount };
  }, [alerts.length, drivers, loads]);

  const ask = (prompt: string) => {
    const clean = prompt.trim();
    if (!clean) return;
    setInput(clean);
    setLoading(true);
    window.setTimeout(() => {
      const response = buildCopilotResponse({
        prompt: clean,
        loads,
        drivers,
        alerts,
      });
      setTurns((prev) => [
        {
          id: `${Date.now()}`,
          prompt: clean,
          response,
        },
        ...prev,
      ]);
      setLoading(false);
    }, 280);
  };

  const runAction = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("profit")) onOpenProfitability();
    else if (lower.includes("compliance") || lower.includes("hos")) onOpenAlerts();
    else onOpenDispatch();
  };

  return (
    <div className="fade-in grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
      <aside className="panel p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#14362a] text-[#26d69b]">
            <Bot className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-black text-white">AI Dispatch Copilot</p>
            <p className="mt-1 text-xs text-[#8ea198]">
              Operational answers from current loads, drivers, HOS, and alerts.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <CopilotStat label="Pending loads" value={summary.pendingLoads} />
          <CopilotStat label="Ready drivers" value={summary.readyDrivers} />
          <CopilotStat label="Risk signals" value={summary.riskCount} danger />
        </div>

        <div className="mt-5">
          <p className="text-xs font-black uppercase text-[#8ea198]">
            Suggested prompts
          </p>
          <div className="mt-3 grid gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => ask(prompt)}
                className="rounded-lg border border-white/10 bg-[#0d1210] px-3 py-2 text-left text-sm font-bold text-[#b8c8c0] transition hover:border-[#26d69b]/40 hover:text-white"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="panel flex min-h-[680px] flex-col p-5">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-sm font-black text-white">Copilot Workspace</p>
            <p className="mt-1 text-xs text-[#8ea198]">
              Ask dispatch questions and jump into the relevant workflow.
            </p>
          </div>
          <Badge variant="green">Connected data</Badge>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
          className="mt-4 flex gap-2"
        >
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#070908] px-3 py-2.5">
            <MessageSquareText className="h-4 w-4 text-[#8ea198]" />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-[#64776e]"
              placeholder="Ask about loads, drivers, HOS, margin, or trip risk"
            />
          </label>
          <button
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#26d69b] px-4 py-2.5 text-sm font-black text-[#03120c] hover:bg-[#55f0b1] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 spin-ring" /> : <Send className="h-4 w-4" />}
            Ask
          </button>
        </form>

        <div className="mt-5 grid flex-1 content-start gap-4 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-lg border border-[#26d69b]/20 bg-[#07100d] p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 spin-ring text-[#26d69b]" />
                <p className="text-sm font-black text-white">
                  Reading fleet state and building recommendation
                </p>
              </div>
            </div>
          ) : null}

          {turns.length === 0 && !loading ? (
            <div className="rounded-lg border border-white/10 bg-[#0d1210] p-8 text-center">
              <Sparkles className="mx-auto h-9 w-9 text-[#26d69b]" />
              <h2 className="mt-4 text-xl font-black text-white">
                Ask an operational question.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8ea198]">
                The copilot uses live demo loads, driver readiness, HOS, margin
                rules, and alerts to produce dispatch-ready answers.
              </p>
            </div>
          ) : null}

          {turns.map((turn) => (
            <article
              key={turn.id}
              className="rounded-lg border border-white/10 bg-[#0d1210] p-4"
            >
              <div className="rounded-lg border border-white/10 bg-[#070908] p-3">
                <p className="text-xs font-black uppercase text-[#8ea198]">
                  Dispatcher
                </p>
                <p className="mt-1 text-sm font-bold text-white">{turn.prompt}</p>
              </div>

              <div className="mt-4 rounded-lg border border-[#26d69b]/20 bg-[#07100d] p-4">
                <div className="flex items-start gap-3">
                  <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#26d69b]" />
                  <div>
                    <p className="text-sm font-black text-white">FleetIQ answer</p>
                    <p className="mt-2 text-sm leading-6 text-[#b8c8c0]">
                      {turn.response.answer}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div>
                  <p className="text-xs font-black uppercase text-[#8ea198]">
                    Supporting facts
                  </p>
                  <div className="mt-2 grid gap-2">
                    {turn.response.supportingFacts.map((fact) => (
                      <div
                        key={fact}
                        className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#111a16] p-3"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#26d69b]" />
                        <p className="text-sm leading-5 text-[#b8c8c0]">{fact}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[#8ea198]">
                    Recommendation
                  </p>
                  <p className="mt-2 rounded-lg border border-white/10 bg-[#111a16] p-3 text-sm leading-6 text-white">
                    {turn.response.recommendation}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {turn.response.relatedActions.map((action) => (
                      <button
                        key={action}
                        onClick={() => runAction(action)}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#070908] px-3 py-2 text-xs font-black text-white hover:border-[#26d69b]/45"
                      >
                        {action}
                        <ArrowRight className="h-3.5 w-3.5 text-[#26d69b]" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CopilotStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1210] p-4">
      <p className="text-xs font-black uppercase text-[#8ea198]">{label}</p>
      <p
        className={`mono mt-2 text-3xl font-black ${
          danger ? "text-[#ff5d6c]" : "text-[#26d69b]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
