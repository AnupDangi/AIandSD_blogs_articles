import Image from "next/image";

/**
 * The product logo lockup. Both variants are rendered and CSS shows the one that matches the
 * active theme (logo-light for light surfaces, logo-dark for dark surfaces), so there is no flash.
 * The parent link carries the accessible name.
 */
export function BrandLogo({ className = "brand-logo", priority = false }: { className?: string; priority?: boolean }) {
  return <>
    <Image src="/brand/logo-light.svg" alt="" aria-hidden="true" width={718} height={160} className={`${className} brand-logo-light`} priority={priority} />
    <Image src="/brand/logo-dark.svg" alt="" aria-hidden="true" width={718} height={160} className={`${className} brand-logo-dark`} priority={priority} />
  </>;
}
