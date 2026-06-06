"use client";

import { useRef, useState } from "react";
import type { MenuItem } from "@/lib/types";

export function Dish3D({ dish, src, large = false }: { dish: MenuItem; src?: string; large?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });
  const [failed, setFailed] = useState(false);

  function move(clientX: number, clientY: number) {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const range = large ? 28 : 16;
    setState({
      ry: (px - 0.5) * range,
      rx: (0.5 - py) * (range - 4),
      mx: px * 100,
      my: py * 100,
      active: true
    });
  }

  function reset() {
    setState((current) => ({ ...current, rx: 0, ry: 0, mx: 50, my: 50, active: false }));
  }

  const showImage = src && !failed;

  return (
    <div
      ref={ref}
      className="dish3d"
      style={{ perspective: large ? 900 : 700 }}
      onMouseMove={(event) => move(event.clientX, event.clientY)}
      onMouseLeave={reset}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (touch) move(touch.clientX, touch.clientY);
      }}
      onTouchEnd={reset}
    >
      <div
        className={`dish3d-card ${large && !state.active ? "dish3d-float" : ""}`}
        style={{
          transform: `rotateX(${state.rx}deg) rotateY(${state.ry}deg) scale(${state.active ? (large ? 1.04 : 1.03) : 1})`,
          transition: state.active ? "transform 40ms linear" : "transform 500ms cubic-bezier(.2,.85,.25,1)",
          boxShadow: `${-state.ry}px ${state.rx + (large ? 26 : 14)}px ${large ? 54 : 30}px rgba(0,0,0,.42)`
        }}
      >
        {showImage ? (
          <img src={src} alt={dish.name} className="dish3d-img" draggable={false} onError={() => setFailed(true)} />
        ) : (
          <div
            className="dish3d-plate"
            style={{
              background:
                `radial-gradient(115% 90% at 32% 24%, ${dish.hue}dd 0%, ${dish.hue}66 38%, #171716 76%),` +
                "radial-gradient(70% 50% at 70% 78%, rgba(0,0,0,.45), rgba(0,0,0,0) 64%)"
            }}
          >
            <span className="dish3d-native">{dish.nativeName ?? dish.category}</span>
            <span className="dish3d-label">photo ready</span>
          </div>
        )}
        <div
          className="dish3d-shine"
          style={{
            background: `radial-gradient(circle at ${state.mx}% ${state.my}%, rgba(255,244,222,.42) 0%, rgba(255,255,255,0) 48%)`,
            opacity: state.active ? 1 : 0.4
          }}
        />
        <div className="dish3d-rim" />
      </div>
    </div>
  );
}
