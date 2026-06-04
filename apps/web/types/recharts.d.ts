import React from 'react';

declare module 'recharts' {
  interface ResponsiveContainerProps {
    width?: string | number;
    height?: string | number;
    children?: React.ReactNode;
  }
  export function ResponsiveContainer(props: ResponsiveContainerProps): React.ReactElement;
  export function BarChart(props: any): React.ReactElement;
  export function AreaChart(props: any): React.ReactElement;
  export function LineChart(props: any): React.ReactElement;
  export function XAxis(props: any): React.ReactElement;
  export function YAxis(props: any): React.ReactElement;
  export function CartesianGrid(props: any): React.ReactElement;
  export function Tooltip(props: any): React.ReactElement;
  export function Bar(props: any): React.ReactElement;
  export function Area(props: any): React.ReactElement;
  export function Line(props: any): React.ReactElement;
}