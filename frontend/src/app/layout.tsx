import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SidebarCookieProvider } from "@/lib/sidebar-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexusAI — Unified AI Agent Platform",
  description: "Build, deploy and orchestrate AI agents, workflows, and RAG pipelines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const collapsed = cookieStore.get("nexusai_sidebar_collapsed");

  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <SidebarCookieProvider initialCollapsed={collapsed?.value === "true"}>
            {children}
          </SidebarCookieProvider>
        </Providers>
      </body>
    </html>
  );
}
