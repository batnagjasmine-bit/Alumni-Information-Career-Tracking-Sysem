"use client";
// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/shared/Sidebar";
import { Navbar } from "@/components/shared/Navbar";
import { FloatingChat } from "@/components/shared/FloatingChat";
import { Suspense } from "react";
import { VerificationToast } from "@/components/shared/VerificationToast";
import { UnreadMessagesProvider } from "@/providers/UnreadMessagesProvider";
import { AnnouncementPopup } from "@/components/shared/AnnouncementPopup";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-72 xl:w-80 shrink-0 flex-col border-r border-sidebar-border print:hidden">
        <Sidebar />
      </aside>

      <UnreadMessagesProvider>
        {/* Main content area */}
        <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible print:block">
          <div className="print:hidden">
            <Navbar />
          </div>
          <main className="flex-1 overflow-y-auto print:overflow-visible print:p-0">
            <div className="page-container py-10 print:p-0 print:m-0 print:max-w-none">
              {children}
            </div>
          </main>
        </div>

        {/* Global Elements */}
        <div className="print:hidden">
          <Suspense fallback={null}>
            <FloatingChat />
            <VerificationToast />
            <AnnouncementPopup />
          </Suspense>
        </div>
      </UnreadMessagesProvider>
    </div>
  );
}
