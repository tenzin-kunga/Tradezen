"use client";
import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedCounter({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  decimals = 2,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(value);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number>();
  const prevValue = useRef(value);

  useEffect(() => {
    if (value === prevValue.current) {
      setDisplay(value);
      return;
    }
    const startVal = prevValue.current;
    const diff = value - startVal;
    if (diff === 0) {
      setDisplay(value);
      return;
    }
    startRef.current = null;

    const animate = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setDisplay(startVal + diff * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    prevValue.current = value;

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  const formatted = display.toFixed(decimals);
  const sign = value >= 0 && prefix === "$" ? "+" : "";

  return (
    <span>
      {sign}{prefix}{formatted}{suffix}
    </span>
  );
}
