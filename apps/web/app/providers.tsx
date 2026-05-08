"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { ConnectKitProvider } from "connectkit";
import { createConfig, http } from "wagmi";
import { mantleSepolia, mantleMainnet } from "@/lib/mantle/rpc";
import { useState } from "react";

const wagmiConfig = createConfig({
  chains: [mantleSepolia, mantleMainnet],
  transports: {
    [mantleSepolia.id]: http(),
    [mantleMainnet.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="midnight">
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
