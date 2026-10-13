import type { ReactNode } from "react";
import { AcademyHeader } from "@/components/academy-header";
import { AcademyFooter } from "@/components/academy-footer";

export default function AcademyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="academy-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AcademyHeader />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <AcademyFooter />
    </div>
  );
}
