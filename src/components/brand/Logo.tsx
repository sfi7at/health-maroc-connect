import { cn } from "@/lib/utils";
import darkMark from "@/assets/vytalma-mark-dark.png.asset.json";
import lightMark from "@/assets/vytalma-mark-light.png.asset.json";

type LogoProps = {
  className?: string;
  alt?: string;
};

/**
 * Official Vytalma brand mark.
 * Automatically swaps between the black mark (light theme) and
 * the white mark (dark theme) using Tailwind's `dark:` variant.
 */
export function Logo({ className, alt = "Vytalma" }: LogoProps) {
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      <img
        src={darkMark.url}
        alt={alt}
        className="block h-full w-full object-contain dark:hidden"
        draggable={false}
      />
      <img
        src={lightMark.url}
        alt=""
        aria-hidden="true"
        className="hidden h-full w-full object-contain dark:block"
        draggable={false}
      />
    </span>
  );
}

export { darkMark as vytalmaLogoDark, lightMark as vytalmaLogoLight };