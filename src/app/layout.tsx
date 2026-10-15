import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@/components/academy.css";
import "@/components/studio.css";

// Fonts are bundled from installed packages so builds never fetch from a font CDN.
const geist = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist",
  display: "swap",
});

const plexSans = localFont({
  src: "../../node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
  weight: "100 700",
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-ibm-plex-mono",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: { default: "LearnLikeADev: learn technology by building", template: "%s | LearnLikeADev" },
  description: "Understand the mechanism. Test it. Build something that works.",
  applicationName: "LearnLikeADev",
  icons: { icon: "/brand-symbol.png", apple: "/brand-symbol.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('academy-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:'system'}catch{document.documentElement.dataset.theme='system'}` }}/>{children}</body>
    </html>
  );
}
