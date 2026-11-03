
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Focus", minutes: 25 },
  { label: "Pause courte", minutes: 5 },
  { label: "Pause longue", minutes: 15 },
];

export function PomodoroTimer() {
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [preset, setPreset] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback((presetIdx: number) => {
    setRunning(false);
    setSeconds(PRESETS[presetIdx].minutes * 60);
    setPreset(presetIdx);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => setSeconds(s => s - 1), 1000);
    } else if (seconds === 0 && running) {
      setRunning(false);
      // Play notification sound
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.frequency.value = 800;
        osc.connect(ctx.destination);
        osc.start();
        setTimeout(() => { osc.stop(); ctx.close(); }, 300);
      } catch {}
      // Auto-switch to next preset
      const next = preset === 0 ? 1 : 0;
      setTimeout(() => reset(next), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, seconds, preset, reset]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = 1 - seconds / (PRESETS[preset].minutes * 60);

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setOpen(true)}
        title="Timer Pomodoro"
      >
        <Timer className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-background border rounded-2xl shadow-2xl p-4 w-56 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground">{PRESETS[preset].label}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Circular progress */}
      <div className="relative w-28 h-28 mx-auto mb-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="stroke-muted" />
          <circle
            cx="50" cy="50" r="45" fill="none" strokeWidth="6"
            className="stroke-primary transition-all duration-1000"
            strokeDasharray={`${progress * 283} 283`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-mono font-bold tabular-nums">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => reset(preset)}>
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          className={cn("h-10 w-10 rounded-full", running && "bg-destructive hover:bg-destructive/90")}
          onClick={() => setRunning(!running)}
        >
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </Button>
      </div>

      {/* Presets */}
      <div className="flex gap-1">
        {PRESETS.map((p, i) => (
          <Button
            key={i}
            variant={preset === i ? "default" : "ghost"}
            size="sm"
            className="flex-1 text-[10px] h-7 px-1"
            onClick={() => reset(i)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
