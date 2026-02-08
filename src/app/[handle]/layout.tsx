import { TopNav } from "@/components/layout/top-nav";

export const dynamic = "force-dynamic";

export default function HandleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="pt-20">{children}</main>
    </>
  );
}
