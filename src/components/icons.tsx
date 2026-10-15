import type { ComponentType, SVGProps } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { BookOpenTextIcon } from "@phosphor-icons/react/dist/ssr/BookOpenText";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CloudIcon } from "@phosphor-icons/react/dist/ssr/Cloud";
import { CodeIcon } from "@phosphor-icons/react/dist/ssr/Code";
import { FlaskIcon } from "@phosphor-icons/react/dist/ssr/Flask";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr/GithubLogo";
import { GoogleLogoIcon } from "@phosphor-icons/react/dist/ssr/GoogleLogo";
import { HammerIcon } from "@phosphor-icons/react/dist/ssr/Hammer";
import { LightbulbIcon } from "@phosphor-icons/react/dist/ssr/Lightbulb";
import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { MonitorIcon } from "@phosphor-icons/react/dist/ssr/Monitor";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { TreeStructureIcon } from "@phosphor-icons/react/dist/ssr/TreeStructure";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";

type PhosphorProps = SVGProps<SVGSVGElement> & { weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone"; size?: string | number };

/**
 * One icon family (Phosphor), one weight, sized by the surrounding text.
 * Icons are always decorative here: every control keeps its visible text label.
 */
function decorative(Glyph: ComponentType<PhosphorProps>, name: string) {
  function Icon({ className }: { className?: string }) {
    return <Glyph aria-hidden="true" focusable="false" weight="regular" className={className ? `icon ${className}` : "icon"} />;
  }
  Icon.displayName = name;
  return Icon;
}

export const ArrowLeft = decorative(ArrowLeftIcon, "ArrowLeft");
export const ArrowRight = decorative(ArrowRightIcon, "ArrowRight");
export const ArrowUpRight = decorative(ArrowUpRightIcon, "ArrowUpRight");
export const BookOpenText = decorative(BookOpenTextIcon, "BookOpenText");
export const CalendarDots = decorative(CalendarDotsIcon, "CalendarDots");
export const Check = decorative(CheckIcon, "Check");
export const Cloud = decorative(CloudIcon, "Cloud");
export const Code = decorative(CodeIcon, "Code");
export const Flask = decorative(FlaskIcon, "Flask");
export const GithubLogo = decorative(GithubLogoIcon, "GithubLogo");
export const GoogleLogo = decorative(GoogleLogoIcon, "GoogleLogo");
export const Hammer = decorative(HammerIcon, "Hammer");
export const Lightbulb = decorative(LightbulbIcon, "Lightbulb");
export const List = decorative(ListIcon, "List");
export const Monitor = decorative(MonitorIcon, "Monitor");
export const Moon = decorative(MoonIcon, "Moon");
export const Sun = decorative(SunIcon, "Sun");
export const TreeStructure = decorative(TreeStructureIcon, "TreeStructure");
export const WarningCircle = decorative(WarningCircleIcon, "WarningCircle");
