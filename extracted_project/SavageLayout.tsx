import { ReactNode } from "react";
import SavageSidebar from "./SavageSidebar";

interface SavageLayoutProps {
  children: ReactNode;
}

export default function SavageLayout({ children }: SavageLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <SavageSidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 overflow-auto">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
