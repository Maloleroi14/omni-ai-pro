import { useEffect, useRef, memo, useMemo } from "react";
import type { SiteEvent } from "@/hooks/useActiveEvent";

interface Props {
  event: SiteEvent;
}

function EventAnimationOverlayInner({ event }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const type = event.styles.animation_type;
    if (type === "none") return;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; char: string; color: string;
      rotation: number; rotationSpeed: number;
      life?: number; maxLife?: number;
      wave?: number; waveSpeed?: number;
      scale?: number; scaleDir?: number;
    }

    const particles: Particle[] = [];
    const count = type === "matrix" ? 80 : type === "fireworks" ? 40 : type === "confetti" ? 70 : 60;

    // Detect event theme by name for special particles
    const nameLower = event.name.toLowerCase();
    const isFish = nameLower.includes("poisson") || nameLower.includes("avril");
    const isChristmas = nameLower.includes("noël") || nameLower.includes("noel") || nameLower.includes("christmas");
    const isHalloween = nameLower.includes("halloween");
    const isEaster = nameLower.includes("pâques") || nameLower.includes("paques") || nameLower.includes("easter");
    const isBirthday = nameLower.includes("anniversaire") || nameLower.includes("birthday");
    const isValentine = nameLower.includes("valentin");
    const isNewYear = nameLower.includes("nouvel an") || nameLower.includes("new year");

    const charMap: Record<string, string[]> = {
      snow: isChristmas ? ["❄", "❅", "❆", "✦", "🎄", "🎅", "⭐", "🎁"] : ["❄", "❅", "❆", "✦", "✧", "·", "°"],
      confetti: isBirthday ? ["🎂", "🎁", "🎈", "🎉", "🥳", "★", "●", "♦"] : isEaster ? ["🐰", "🥚", "🐣", "🌸", "🌷", "★", "●"] : ["■", "●", "▲", "♦", "★", "◆", "▪", "⬟"],
      hearts: isValentine ? ["❤", "♥", "💕", "💖", "💗", "💓", "🌹", "💘", "💝"] : ["❤", "♥", "💕", "💖", "💗", "💓", "♡", "❣"],
      stars: isHalloween ? ["🎃", "👻", "🦇", "💀", "🕷", "⭐", "✦"] : ["⭐", "✨", "★", "✦", "⚡", "✧", "☆", "✫"],
      fireworks: isNewYear ? ["🎆", "🎇", "✦", "★", "🥂", "🍾", "✧"] : ["✦", "●", "★", "✧", "◆", "✸", "✹"],
      bubbles: isFish ? ["🐟", "🐠", "🐡", "🎣", "🐳", "🐬", "🫧", "○"] : ["○", "◯", "●", "◦", "◌", "⊙", "⊚"],
      matrix: ["0", "1", "ア", "カ", "サ", "タ", "ナ", "ハ", "マ", "ヤ", "ラ", "ワ"],
    };

    const chars = charMap[type] || ["●"];
    const colors = type === "matrix"
      ? ["#00ff00", "#00cc00", "#009900"]
      : [event.styles.primary_color, event.styles.secondary_color, "#ffffff", event.styles.primary_color + "aa"];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: type === "confetti" ? (Math.random() - 0.5) * 3 : type === "bubbles" ? (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * 0.8,
        vy: type === "bubbles" ? -(Math.random() * 1.5 + 0.5) : type === "snow" ? Math.random() * 1 + 0.3 : Math.random() * 2 + 0.5,
        size: type === "matrix" ? Math.random() * 6 + 12 : Math.random() * 18 + 10,
        opacity: Math.random() * 0.5 + 0.25,
        char: chars[Math.floor(Math.random() * chars.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5,
        wave: Math.random() * Math.PI * 2,
        waveSpeed: Math.random() * 0.03 + 0.01,
        scale: 1,
        scaleDir: Math.random() > 0.5 ? 0.005 : -0.005,
      });
    }

    // Fireworks: periodic bursts
    let fireworkTimer = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fireworks burst logic
      if (type === "fireworks") {
        fireworkTimer++;
        if (fireworkTimer % 90 === 0) {
          const bx = Math.random() * canvas.width;
          const by = Math.random() * canvas.height * 0.5;
          for (let j = 0; j < 15; j++) {
            const angle = (j / 15) * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            particles.push({
              x: bx, y: by,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * 12 + 6,
              opacity: 1,
              char: chars[Math.floor(Math.random() * chars.length)],
              color: colors[Math.floor(Math.random() * colors.length)],
              rotation: 0, rotationSpeed: (Math.random() - 0.5) * 8,
              life: 0, maxLife: 60 + Math.random() * 40,
              wave: 0, waveSpeed: 0, scale: 1, scaleDir: 0,
            });
          }
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.font = `${p.size * (p.scale || 1)}px sans-serif`;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillText(p.char, 0, 0);
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Wave motion for snow/bubbles
        if (p.wave !== undefined && (type === "snow" || type === "bubbles" || type === "hearts")) {
          p.wave += p.waveSpeed || 0.02;
          p.x += Math.sin(p.wave) * 0.5;
        }

        // Pulsing scale
        if (p.scale !== undefined && p.scaleDir) {
          p.scale += p.scaleDir;
          if (p.scale > 1.2 || p.scale < 0.8) p.scaleDir = -p.scaleDir;
        }

        // Life for fireworks
        if (p.life !== undefined && p.maxLife !== undefined) {
          p.life++;
          p.opacity = Math.max(0, 1 - p.life / p.maxLife);
          p.vy += 0.03; // gravity
          if (p.life >= p.maxLife) {
            particles.splice(i, 1);
            continue;
          }
        }

        // Wrap
        if (p.y > canvas.height + 30) { p.y = -30; p.x = Math.random() * canvas.width; }
        if (p.y < -30 && type === "bubbles") { p.y = canvas.height + 30; p.x = Math.random() * canvas.width; }
        if (p.x > canvas.width + 30) p.x = -30;
        if (p.x < -30) p.x = canvas.width + 30;
      }

      // Keep particle count reasonable for fireworks
      if (type === "fireworks" && particles.length > 200) {
        particles.splice(0, particles.length - 200);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [event.styles.animation_type, event.styles.primary_color, event.styles.secondary_color]);

  if (event.styles.animation_type === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[60]"
      style={{ opacity: 0.75 }}
    />
  );
}

export const EventAnimationOverlay = memo(EventAnimationOverlayInner);
