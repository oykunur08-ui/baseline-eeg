"use client";

export interface StreamConfig {
  driftIntensity: number; // 0–3
  noiseLevel:     number; // 0–3
  nChannels:      2 | 4 | 8;
  aligned:        "none" | "zscore" | "movingavg";
  seed:           number;
}

interface StreamControlsProps {
  config: StreamConfig;
  isRunning: boolean;
  onConfigChange: (patch: Partial<StreamConfig>) => void;
  onToggle: () => void;
  onReset: () => void;
}

function Slider({
  label, value, min, max, step, onChange, fmt,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-parchment/40 w-14 flex-shrink-0 font-mono">{label}</label>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-teal h-0.5"
        style={{ accentColor: "#1E6B5C" }}
      />
      <span className="text-xs font-mono text-teal w-8 text-right">
        {fmt ? fmt(value) : value}
      </span>
    </div>
  );
}

export default function StreamControls({
  config, isRunning, onConfigChange, onToggle, onReset,
}: StreamControlsProps) {
  return (
    <div className="border-b border-dark-border bg-dark-surface/60 backdrop-blur-sm">
      <div className="container-wide py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">

          {/* Transport */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onToggle}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-all ${
                isRunning
                  ? "border-amber/50 text-amber hover:bg-amber/10"
                  : "border-teal/50 text-teal hover:bg-teal/10"
              }`}
            >
              {isRunning ? "⏸ Pause" : "▶ Start"}
            </button>
            <button
              onClick={onReset}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-dark-border
                         text-parchment/35 hover:border-dark-muted hover:text-parchment/60 transition-all"
            >
              Reset
            </button>
          </div>

          {/* Separator */}
          <div className="hidden md:block h-4 w-px bg-dark-border flex-shrink-0" />

          {/* Sliders */}
          <div className="flex flex-col gap-2 w-40 flex-shrink-0">
            <Slider
              label="drift" value={config.driftIntensity} min={0} max={3} step={0.1}
              onChange={(v) => onConfigChange({ driftIntensity: v })}
              fmt={(v) => v.toFixed(1)}
            />
            <Slider
              label="noise" value={config.noiseLevel} min={0} max={3} step={0.1}
              onChange={(v) => onConfigChange({ noiseLevel: v })}
              fmt={(v) => v.toFixed(1)}
            />
          </div>

          {/* Separator */}
          <div className="hidden md:block h-4 w-px bg-dark-border flex-shrink-0" />

          {/* Channel count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono text-parchment/30 mr-1">ch</span>
            {([2, 4, 8] as const).map((n) => (
              <button
                key={n}
                onClick={() => onConfigChange({ nChannels: n })}
                className={`text-xs font-mono px-2.5 py-1 rounded border transition-all ${
                  config.nChannels === n
                    ? "border-parchment/30 text-parchment bg-parchment/8"
                    : "border-dark-border text-parchment/30 hover:border-dark-muted"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="hidden md:block h-4 w-px bg-dark-border flex-shrink-0" />

          {/* Alignment */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono text-parchment/30 mr-1">align</span>
            {(["none", "zscore", "movingavg"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onConfigChange({ aligned: m })}
                className={`text-xs font-medium px-3 py-1 rounded border transition-all ${
                  config.aligned === m
                    ? m === "none"
                      ? "border-parchment/30 text-parchment bg-parchment/8"
                      : "border-teal/50 text-teal bg-teal/8"
                    : "border-dark-border text-parchment/30 hover:border-dark-muted"
                }`}
              >
                {m === "none" ? "Raw" : m === "zscore" ? "Z-score" : "Mov. avg"}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="hidden md:block h-4 w-px bg-dark-border flex-shrink-0" />

          {/* Seed */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono text-parchment/30">seed</span>
            <input
              type="number"
              value={config.seed}
              onChange={(e) => onConfigChange({ seed: Number(e.target.value) || 42 })}
              className="w-16 bg-dark-card border border-dark-border rounded px-2 py-1
                         text-xs font-mono text-parchment/60 focus:outline-none focus:border-dark-muted"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
