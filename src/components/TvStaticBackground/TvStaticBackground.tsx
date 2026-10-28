import { useEffect, useRef } from "react";
import "./TvStaticBackground.css";

// Drawn at a tiny resolution and stretched by CSS — the blockiness and
// horizontal smear are part of the "bad analog signal" look, and it keeps
// the per-frame cost to a few hundred fillRects.
const WIDTH = 240;
const HEIGHT = 90;
const FPS = 20;
const ROLL_ROWS_PER_SECOND = 9;

type Band = { rows: number; colors: string[] } | { rows: number; streaks: true };

// One full vertical cycle of the rolling picture, top to bottom.
const BANDS: Band[] = [
  { rows: 34, colors: ["#c0c0c0", "#c0c000", "#00c0c0", "#00b000", "#c000c0", "#c00000", "#0000c0"] },
  { rows: 6, colors: ["#0000c0", "#131313", "#c000c0", "#131313", "#00c0c0", "#131313", "#c0c0c0"] },
  { rows: 18, colors: ["#1d1d6b", "#1d1d6b", "#9a9a9a", "#9a9a9a", "#131313", "#d8d8d8", "#0b3a4a"] },
  { rows: 16, streaks: true },
];
const CYCLE_ROWS = BANDS.reduce((sum, b) => sum + b.rows, 0);

const bandAt = (row: number) => {
  let r = ((row % CYCLE_ROWS) + CYCLE_ROWS) % CYCLE_ROWS;
  for (let i = 0; i < BANDS.length; i++) {
    if (r < BANDS[i].rows) return { band: BANDS[i], index: i };
    r -= BANDS[i].rows;
  }
  return { band: BANDS[0], index: 0 };
};

const drawFrame = (ctx: CanvasRenderingContext2D, t: number) => {
  const roll = Math.floor(t * ROLL_ROWS_PER_SECOND);
  // Occasional hard horizontal tear across the whole picture.
  const tear = Math.random() < 0.06 ? (Math.random() - 0.5) * 40 : 0;

  for (let y = 0; y < HEIGHT; y++) {
    const row = y + roll;
    const { band, index } = bandAt(row);

    if ("streaks" in band) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, y, WIDTH, 1);
      if (Math.random() < 0.45) {
        ctx.fillStyle = Math.random() < 0.5 ? "#d0d0d0" : "#6a6a6a";
        ctx.fillRect(Math.random() * WIDTH, y, 8 + Math.random() * 40, 1);
      }
      continue;
    }

    const barWidth = WIDTH / band.colors.length;
    // The whole row wobbles together, then each bar boundary gets its own
    // jagged offset so the edges zig-zag like the edges of a smeared signal.
    const rowShift =
      tear +
      Math.sin(row * 0.21 - t * 3 + index) * 6 +
      Math.sin(row * 1.7 + t * 11) * 1.5;
    let x = 0;
    for (let i = 0; i < band.colors.length; i++) {
      const jag =
        i === band.colors.length - 1
          ? WIDTH
          : (i + 1) * barWidth +
            rowShift +
            Math.sin(row * (0.9 + i * 0.37) + t * (7 + i)) * (2 + i * 0.6) +
            (Math.random() - 0.5) * 3;
      const end = Math.max(x, Math.min(WIDTH, jag));
      ctx.fillStyle = band.colors[i];
      ctx.fillRect(x, y, end - x + 1, 1);
      x = end;
    }

    // Per-row brightness flicker, plus the odd bright noise dash.
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
    ctx.fillRect(0, y, WIDTH, 1);
    if (Math.random() < 0.15) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(Math.random() * WIDTH, y, 2 + Math.random() * 10, 1);
    }
  }
};

const TvStaticBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      drawFrame(ctx, 0);
      return;
    }

    let frameId = 0;
    let lastDrawn = 0;
    const tick = (now: number) => {
      // Throttled well below the display rate — the choppiness reads as
      // "old TV", and it's cheaper.
      if (now - lastDrawn >= 1000 / FPS) {
        lastDrawn = now;
        drawFrame(ctx, now / 1000);
      }
      frameId = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!frameId) frameId = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    // Stop the loop entirely while the hero is scrolled out of view. The
    // last frame stays on the canvas, and since the picture is a function of
    // time, resuming just jumps ahead rather than replaying.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    });
    observer.observe(ctx.canvas);
    start();

    return () => {
      observer.disconnect();
      stop();
    };
  }, []);

  return (
    <div className="tv-static" aria-hidden="true">
      <canvas ref={canvasRef} className="tv-static-canvas" width={WIDTH} height={HEIGHT} />
    </div>
  );
};

export default TvStaticBackground;
