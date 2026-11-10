"use client";

import * as React from "react";

export function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}