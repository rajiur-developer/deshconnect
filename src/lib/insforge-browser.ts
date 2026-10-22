"use client";

import { createBrowserClient } from "@insforge/sdk/ssr";

const browserGlobal = globalThis as typeof globalThis & {
  __deshConnectInsForgeClient?: ReturnType<typeof createBrowserClient>;
};

export function getInsForgeBrowserClient() {
  browserGlobal.__deshConnectInsForgeClient ??= createBrowserClient();
  return browserGlobal.__deshConnectInsForgeClient;
}
