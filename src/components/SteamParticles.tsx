// ============================================================
// SteamParticles — Canvas-based particle effects
//
// Usage:
//   <SteamParticles active count={40} color="#b58921" />
//   <SteamParticles active kind="celebration" />
//   <SteamParticles active kind="sparks" origin="center" />
// ============================================================

import { useRef, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";

type ParticleKind = "steam" | "celebration" | "sparks" | "unlock";

interface Props {
  active: boolean;
  kind?: ParticleKind;
  count?: number;
  color?: string;
  duration?: number;
  style?: CSSProperties;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

const BRASS = "#b58921";
const COPPER = "#b87333";
const GOLD = "#d4a42a";
const GREEN = "#3fb950";
const SPARK_COLORS = [BRASS, COPPER, GOLD, "#fff", "#e8c84a"];
const CELEBRATION_COLORS = [BRASS, COPPER, GOLD, GREEN, "#fff", "#e8c84a", "#ff8844"];
const UNLOCK_COLORS = [GREEN, "#2d8a44", "#5adb78", "#fff", BRASS];

export function SteamParticles({
  active,
  kind = "steam",
  count = 30,
  color,
  duration = 2000,
  style,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const getColors = useCallback(() => {
    if (color) return [color];
    switch (kind) {
      case "celebration": return CELEBRATION_COLORS;
      case "sparks": return SPARK_COLORS;
      case "unlock": return UNLOCK_COLORS;
      default: return [BRASS, COPPER];
    }
  }, [color, kind]);

  const createParticle = useCallback((canvas: HTMLCanvasElement): Particle => {
    const colors = getColors();
    const c = colors[Math.floor(Math.random() * colors.length)];
    const w = canvas.width;
    const h = canvas.height;

    switch (kind) {
      case "celebration": {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4;
        return {
          x: w / 2 + (Math.random() - 0.5) * 60,
          y: h / 2 + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          size: 2 + Math.random() * 5,
          life: 0,
          maxLife: 60 + Math.random() * 60,
          color: c,
          opacity: 0.9 + Math.random() * 0.1,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
        };
      }
      case "sparks": {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
        const speed = 2 + Math.random() * 3;
        return {
          x: w / 2 + (Math.random() - 0.5) * w * 0.6,
          y: h * 0.8 + Math.random() * h * 0.2,
          vx: Math.cos(angle) * speed * 0.5,
          vy: Math.sin(angle) * speed,
          size: 1 + Math.random() * 3,
          life: 0,
          maxLife: 30 + Math.random() * 40,
          color: c,
          opacity: 0.8 + Math.random() * 0.2,
          rotation: 0,
          rotationSpeed: 0,
        };
      }
      case "unlock": {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        return {
          x: w / 2,
          y: h / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 4,
          life: 0,
          maxLife: 40 + Math.random() * 40,
          color: c,
          opacity: 1,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
        };
      }
      default: {
        return {
          x: Math.random() * w,
          y: h + 5,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -(0.5 + Math.random() * 1.5),
          size: 2 + Math.random() * 6,
          life: 0,
          maxLife: 60 + Math.random() * 80,
          color: c,
          opacity: 0.3 + Math.random() * 0.3,
          rotation: 0,
          rotationSpeed: 0,
        };
      }
    }
  }, [getColors, kind]);

  useEffect(() => {
    if (!active) {
      particlesRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    startTimeRef.current = performance.now();

    for (let i = 0; i < count; i++) {
      const p = createParticle(canvas);
      p.life = Math.random() * p.maxLife * 0.5;
      particlesRef.current.push(p);
    }

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;

      ctx.clearRect(0, 0, rect.width, rect.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (kind === "celebration") {
          p.vy += 0.04;
          p.vx *= 0.99;
        } else if (kind === "sparks") {
          p.vy += 0.06;
          p.vx *= 0.98;
        } else if (kind === "unlock") {
          p.vx *= 0.97;
          p.vy *= 0.97;
        } else {
          p.vx += (Math.random() - 0.5) * 0.1;
          p.size *= 1.005;
        }

        const progress = p.life / p.maxLife;
        const alpha = progress < 0.2
          ? progress / 0.2
          : progress > 0.7
            ? (1 - progress) / 0.3
            : 1;

        if (p.life >= p.maxLife) {
          if (duration === 0 || elapsed < duration) {
            const newP = createParticle(canvas);
            Object.assign(p, newP);
            return true;
          }
          return false;
        }

        ctx.save();
        ctx.globalAlpha = alpha * p.opacity;
        ctx.translate(p.x / window.devicePixelRatio, p.y / window.devicePixelRatio);

        if (kind === "celebration" || kind === "unlock") {
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          if (Math.random() > 0.5) {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (kind === "sparks") {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return true;
      });

      if (particlesRef.current.length > 0) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      particlesRef.current = [];
    };
  }, [active, count, createParticle, duration, kind]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 50,
        ...style,
      }}
    />
  );
}
