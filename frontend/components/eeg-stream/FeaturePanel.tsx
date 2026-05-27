"use client";
import { CHANNEL_COLORS, ALL_CHANNEL_NAMES } from "../../lib/eeg-stream/signalGenerator";
import type { ChannelMetrics } from "../../lib/eeg-stream/featureExtraction";

interface FeaturePanelProps {
  metrics: ChannelMetrics[];
  nChannels: number;
  driftIndex: number;
  isCalibrated: boolean;
  sessionTime: number;
}

function StabilityBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(value * 100);
  const barColor =
    value > 0.75 ? "#1E6B5C" :
    value > 0.45 ? "#B8832A" :
    "#8B3030";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-dark-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <span className="text-xs font-mono w-7 text-right" style={{ color: barColor + "CC" }}>
        {pct}%
      </span>
    </div>
  );
}

export default function FeaturePanel({
  metrics, nChannels, driftIndex, isCalibrated, sessionTime,
}: FeaturePanelProps) {
  const mins = Math.floor(sessionTime / 60);
  const secs = (sessionTime % 60).toFixed(0).padStart(2, "0");

  return (
    <div className="border-t border-dark-border bg-dark-surface/40">
      <div className="container-wide py-4">
        <div className="flex flex-col md:flex-row gap-6">

          {/* Session stats */}
          <div className="flex gap-6 items-start md:flex-col md:gap-3 md:w-48 flex-shrink-0">
            <div>
              <div className="text-xs font-mono text-parchment/25 mb-0.5">Session time</div>
              <div className="text-xl font-light text-parchment font-mono">
                {mins}:{secs}
              </div>
            </div>

            <div>
              <div className="text-xs font-mono text-parchment/25 mb-1">Drift index</div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-dark-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(driftIndex * 100)}%`,
                      background: driftIndex > 0.6 ? "#8B3030" : driftIndex > 0.3 ? "#B8832A" : "#1E6B5C",
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-parchment/40">
                  {(driftIndex * 100).toFixed(0)}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-mono text-parchment/25 mb-1">Calibration</div>
              <div className={`text-xs font-mono ${isCalibrated ? "text-teal" : "text-amber/70"}`}>
                {isCalibrated ? "✓ locked" : "acquiring…"}
              </div>
            </div>
          </div>

          {/* Per-channel metrics */}
          <div className="flex-1">
            <div className="text-xs font-mono text-parchment/25 mb-3">
              Channel stability, deviation from calibration baseline
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
              {Array.from({ length: nChannels }, (_, ch) => {
                const m = metrics[ch];
                const color = CHANNEL_COLORS[ch % CHANNEL_COLORS.length];
                const name  = ALL_CHANNEL_NAMES[ch] ?? `ch${ch + 1}`;
                return (
                  <div key={ch} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-0.5 rounded" style={{ background: color }} />
                        <span className="text-xs font-mono" style={{ color: color + "99" }}>
                          {name}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-parchment/30">
                        {m ? `${m.alphaPower.toFixed(1)} μV` : "-"}
                      </span>
                    </div>
                    <StabilityBar value={m?.stabilityScore ?? 1} color={color} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insight */}
          <div className="md:w-52 flex-shrink-0 hidden lg:block">
            <div className="text-xs font-mono text-parchment/20 mb-2">Observation</div>
            <p className="text-xs text-parchment/40 leading-relaxed">
              Stability scores track mean shift from baseline, not decoding
              quality. A channel can be highly stable yet contribute little
              discriminative signal.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
