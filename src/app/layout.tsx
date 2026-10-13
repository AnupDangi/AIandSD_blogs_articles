import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import "@/components/academy.css";
import "@/components/studio.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "LearnLikeADev — Learn technology by building", template: "%s · LearnLikeADev" },
  description: "Understand the mechanism. Test it. Build something that works.",
  applicationName: "LearnLikeADev",
  icons: { icon: "/brand-symbol.png", apple: "/brand-symbol.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`}>
      <body><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('academy-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:'system'}catch{document.documentElement.dataset.theme='system'}` }}/>{children}</body>
    </html>
  );
}
