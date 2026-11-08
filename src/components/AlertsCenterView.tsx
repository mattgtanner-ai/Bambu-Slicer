import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Filter,
  ShieldAlert,
  Trash2,
  Volume2,
} from 'lucide-react';
import type { AlertEvent, AlertRule } from '../types/slicer';

interface AlertsCenterViewProps {
  rules: AlertRule[];
  onToggleRule: (ruleId: string, field: 'enabled' | 'autoPausePrinter' | 'soundAlert') => void;
  events: AlertEvent[];
  onAcknowledgeEvent: (eventId: string) => void;
  onAcknowledgeAll: () => void;
  onClearAcknowledged: () => void;
  onTriggerSimulatedAlert: (type: 'spaghetti' | 'filament_runout' | 'complete') => void;
}

export const AlertsCenterView: React.FC<AlertsCenterViewProps> = ({
  rules,
  onToggleRule,
  events,
  onAcknowledgeEvent,
  onAcknowledgeAll,
  onClearAcknowledged,
  onTriggerSimulatedAlert,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const filteredEvents = events.filter((ev) =>
    severityFilter === 'all' ? true : ev.severity === severityFilter
  );

  const unacknowledgedCount = events.filter((e) => !e.acknowledged).length;

  return (
    <div className="w-full h-full overflow-y-auto bg-[#0b0f17] p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Automated Print & Filament Alert Guardrails
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time Bambu X1 Carbon Micro-LiDAR inspection, AI spaghetti vision, AMS runout protection, and job completion notifications.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onTriggerSimulatedAlert('spaghetti')}
              className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Test Spaghetti Alert
            </button>
            <button
              type="button"
              onClick={() => onTriggerSimulatedAlert('filament_runout')}
              className="px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Test Filament Runout
            </button>
            <button
              type="button"
              onClick={() => onTriggerSimulatedAlert('complete')}
              className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Test Print Completion
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 Columns: Automated Alert Rules Matrix */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                Active X1 Carbon Alert Rules
              </h2>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {rules.filter((r) => r.enabled).length} / {rules.length} Active
              </span>
            </div>

            <div className="divide-y divide-slate-800">
              {rules.map((rule) => (
                <div key={rule.id} className="py-3.5 first:pt-1 last:pb-1 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-100">
                        {rule.name}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {rule.description}
                      </p>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        Trigger Threshold: {rule.thresholdLabel}
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.enabled}
                      aria-label={`Enable ${rule.name}`}
                      onClick={() => onToggleRule(rule.id, 'enabled')}
                      className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                        rule.enabled
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Secondary Toggles for Auto-Pause & Audio Chime */}
                  <div className="flex items-center gap-3 pt-1">
                    {rule.category !== 'print_complete' && (
                      <button
                        type="button"
                        onClick={() => onToggleRule(rule.id, 'autoPausePrinter')}
                        className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                          rule.autoPausePrinter
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Auto-Pause X1C: {rule.autoPausePrinter ? 'On' : 'Off'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleRule(rule.id, 'soundAlert')}
                      className={`text-[11px] px-2.5 py-1 rounded border transition-colors flex items-center gap-1 ${
                        rule.soundAlert
                          ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Volume2 className="w-3 h-3" />
                      Audio Chime: {rule.soundAlert ? 'On' : 'Muted'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 7 Columns: Real-Time Alert Event Feed */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-400" />
                  Alert Event Log & Telemetry Actions
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                  {unacknowledgedCount} unacknowledged · {events.length} total events
                </p>
              </div>

              <div className="flex items-center gap-2">
                {unacknowledgedCount > 0 && (
                  <button
                    type="button"
                    onClick={onAcknowledgeAll}
                    className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Acknowledge All
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClearAcknowledged}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Resolved
                </button>
              </div>
            </div>

            {/* Interactive Segmented Filter Controls */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg w-fit">
              {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                    severityFilter === sev
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev === 'all' ? 'All Events' : sev}
                </button>
              ))}
            </div>

            {/* Event List */}
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                <div className="text-sm font-medium text-slate-200">
                  No alerts match the selected filter
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your Bambu Lab X1 Carbon is operating within nominal thermal, LiDAR, and AMS filament parameters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      ev.acknowledged
                        ? 'bg-slate-950/60 border-slate-800/80 opacity-75'
                        : ev.severity === 'critical'
                        ? 'bg-rose-950/25 border-rose-800/70'
                        : ev.severity === 'warning'
                        ? 'bg-amber-950/25 border-amber-800/70'
                        : 'bg-emerald-950/20 border-emerald-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        {/* Unboxed quiet metadata line */}
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
                          <span
                            className={
                              ev.severity === 'critical'
                                ? 'text-rose-400 font-semibold uppercase'
                                : ev.severity === 'warning'
                                ? 'text-amber-400 font-semibold uppercase'
                                : 'text-emerald-400 font-semibold uppercase'
                            }
                          >
                            {ev.severity}
                          </span>
                          <span>·</span>
                          <span>{ev.formattedTime}</span>
                          <span>·</span>
                          <span>{ev.acknowledged ? 'Resolved' : 'Active Alert'}</span>
                        </div>

                        <h3 className="text-sm font-semibold text-slate-100">
                          {ev.title}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {ev.message}
                        </p>

                        {ev.actionTaken && (
                          <div className="text-xs font-mono text-slate-400 pt-1">
                            Automated Action: {ev.actionTaken}
                          </div>
                        )}
                      </div>

                      {!ev.acknowledged && (
                        <button
                          type="button"
                          onClick={() => onAcknowledgeEvent(ev.id)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
