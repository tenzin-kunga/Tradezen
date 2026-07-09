"use client";

import { registerAllModules } from "../modules/index";

let initialized = false;

export function initializeWorkspace() {
  if (initialized) return;
  initialized = true;

  registerAllModules();
}

initializeWorkspace();
