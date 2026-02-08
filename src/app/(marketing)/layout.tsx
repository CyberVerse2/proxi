import { TopNav } from "@/components/layout/top-nav";

export const dynamic = "force-dynamic";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="pt-14">{children}</main>
    </>
  );
}
