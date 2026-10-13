import Image from "next/image";

export function BrandMark({ className = "brand-mark", priority = false }: { className?: string; priority?: boolean }) {
  return <Image src="/brand-symbol.png" alt="" aria-hidden="true" width={36} height={36} className={className} priority={priority} />;
}
