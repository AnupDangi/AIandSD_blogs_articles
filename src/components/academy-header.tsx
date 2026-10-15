import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/server/supabase";
import { BrandLogo } from "@/components/brand-mark";
import { List } from "@/components/icons";
import { AcademyNavigation } from "./academy-navigation";
import { ThemePreference } from "./theme-preference";

export async function AcademyHeader() {
  const supabase = await createSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getClaims() : { data: null };
  const signedIn = typeof data?.claims?.sub === "string";
  const accountHref = signedIn ? "/settings" : "/sign-in";
  const accountLabel = signedIn ? "Account" : "Sign in";

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href={signedIn ? "/dashboard" : "/"} aria-label="LearnLikeADev home">
          <BrandLogo priority />
        </Link>
        <AcademyNavigation />
        <div className="header-tools">
          <ThemePreference />
          <Link className="header-action" href={accountHref}>{accountLabel}</Link>
          <details className="mobile-menu">
            <summary aria-label="Open navigation"><List /><span>Menu</span></summary>
            <AcademyNavigation mobile />
          </details>
        </div>
      </div>
    </header>
  );
}
