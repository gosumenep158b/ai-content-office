"use client";

import * as React from "react";

export function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function SelectTrigger({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("relative", className || "")}>
      {children}
    </div>
  );
}

export function SelectItem({
  className,
  value,
  children,
}: { className?: string; value: string; children: React.ReactNode }) {
  return (
    <div
      role="option"
      className={cn(
        "relative py-2 px-3 cursor-default select-none outline-none highlight:bg-highlight",
        className || ""
      )}
    >
      {children}
    </div>
  );
}

export function SelectContent({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <ul
      role="listbox"
      className={cn(
        "absolute z-50 w-64 rounded-md border bg-white shadow-lg p-1 origin-top-left transition-all",
        "focus:outline-none data-[state=open]:data-[state=dropdown-open]:pointer-auto data-[state=disabled]:pointer-none",
        className || ""
      )}
    >
      {children}
    </ul>
  );
}

export function SelectValue({
  className,
}: { className?: string }) {
  return (
    <span className={cn("py-2 px-3 text-sm font-medium text-color-foreground", className || "")}>
      {">"}
    </span>
  );
}

/* Select wrapper component */
export function Select({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn(
      "relative w-full",
      className || ""
    )}>
      <SelectTrigger>
        <SelectValue />
        <SelectContent>{children}</SelectContent>
      </SelectTrigger>
    </div>
  );
}