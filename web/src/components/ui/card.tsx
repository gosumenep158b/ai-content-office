"use client";

import * as React from "react";

export function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", "shadow-sm", className || "")}>
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 md:p-0", className || "")}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <h3 className={cn("font-medium leading-none tracking-tight text-xl", className || "")}>
      {children}
    </h3>
  );
}

export function CardContent({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("p-6 md:pt-0", className || "")}>
      {children}
    </div>
  );
}