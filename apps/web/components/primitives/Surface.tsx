import type { CSSProperties, ReactNode } from "react";

interface SurfaceProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  lift?: boolean;
  as?: "div" | "section" | "article" | "aside";
}

export function Surface({
  children,
  className = "",
  style,
  lift = false,
  as: Tag = "div",
}: SurfaceProps) {
  return (
    <Tag
      className={`tz-panel ${lift ? "tz-lift" : ""} ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}

export default Surface;
