"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Layers, Search, MessageSquare, Radio, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentBadge } from "@/components/AgentBadge";

const NAV = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/wallets", label: "Smart Money", icon: Users },
  { href: "/protocols", label: "Protocols", icon: Layers },
  { href: "/profiler", label: "Profiler", icon: Search },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/oracle", label: "Oracle Log", icon: Radio },
  { href: "/about", label: "About", icon: Info },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-52 shrink-0 border-r border-border bg-card/30 flex flex-col py-4 gap-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-md text-sm transition-colors",
            pathname === href
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {label}
        </Link>
      ))}

      {/* ERC-8004 Agent badge at bottom of sidebar */}
      <div className="mt-auto mx-2 px-1 pb-1">
        <AgentBadge />
      </div>
    </aside>
  );
}
