import CoachSidebar from "@/components/CoachSidebar";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-paper flex">
      <CoachSidebar />
      <div className="flex-1 w-full md:ml-64">
        {children}
      </div>
    </div>
  );
}
