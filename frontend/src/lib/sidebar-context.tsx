"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  setCollapsed: () => {},
});

export function SidebarCookieProvider({
  children,
  initialCollapsed,
}: {
  children: ReactNode;
  initialCollapsed: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    document.cookie = `nexusai_sidebar_collapsed=${collapsed}; path=/; max-age=31536000`;
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
