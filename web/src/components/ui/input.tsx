"use client";

import * as React from "react";

export function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

/* Input */
export function Input({
  className,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className || ""
      )}
      {...props}
    />
  );
}

/* Button */
export function Button({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-disabled disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "active:bg-primary/80",
        "ring-offset-2",
        className || ""
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* Card */
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