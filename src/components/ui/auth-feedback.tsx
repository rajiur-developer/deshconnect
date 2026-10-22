"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

export function AuthFeedback() {
  const { success } = useToast();

  useEffect(() => {
    const current = new URL(window.location.href);
    if (current.searchParams.get("welcome") !== "1") return;
    success("Welcome to DeshConnect!");
    current.searchParams.delete("welcome");
    window.history.replaceState(window.history.state, "", `${current.pathname}${current.search}${current.hash}`);
  }, [success]);

  return null;
}
