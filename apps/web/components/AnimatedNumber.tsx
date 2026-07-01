"use client";

import { useState, useEffect, useRef } from "react";

export function useCountUp(end: number, duration = 800, start = 0) {
  const [value, setValue] = useState(start);
  const prevEnd = useRef(end);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (end === start) {
      setValue(end);
      return;
    }
    const actualStart = prevEnd.current !== end ? prevEnd.current : start;
    prevEnd.current = end;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(actualStart + (end - actualStart) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, start]);

  return value;
}

type AnimatedNumberProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  style?: React.CSSProperties;
  className?: string;
};

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 800,
  style,
  className,
}: AnimatedNumberProps) {
  const animated = useCountUp(value, duration);

  return (
    <span style={style} className={className}>
      {prefix}
      {animated.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
