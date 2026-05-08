"use client";

import { ConnectKitButton } from "connectkit";
import { Activity } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-6 shrink-0">
      <Link href="/" className="flex items-center gap-2 text-primary font-semibold tracking-tight">
        <Activity className="w-5 h-5" />
        MantleScope
      </Link>
      <ConnectKitButton />
    </header>
  );
}
