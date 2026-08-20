import React from "react";

declare module "recharts" {
  interface ResponsiveContainerProps {
    width?: string | number;
    height?: string | number;
    children?: React.ReactNode;
  }
  export function ResponsiveContainer(
    props: ResponsiveContainerProps,
  ): React.ReactElement;
  export function BarChart(props: Record<string, unknown>): React.ReactElement;
  export function AreaChart(props: Record<string, unknown>): React.ReactElement;
  export function LineChart(props: Record<string, unknown>): React.ReactElement;
  export function XAxis(props: Record<string, unknown>): React.ReactElement;
  export function YAxis(props: Record<string, unknown>): React.ReactElement;
  export function CartesianGrid(
    props: Record<string, unknown>,
  ): React.ReactElement;
  export function Tooltip(props: Record<string, unknown>): React.ReactElement;
  export function Bar(props: Record<string, unknown>): React.ReactElement;
  export function Area(props: Record<string, unknown>): React.ReactElement;
  export function Line(props: Record<string, unknown>): React.ReactElement;
}
