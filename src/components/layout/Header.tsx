import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { cn } from "../../lib/utils/cn";
import { Button } from "../common/Button";
import { LanguageToggle } from "./LanguageToggle";

const navItems = [
  { to: "/", key: "home" },
  { to: "/submit", key: "submit" },
  { to: "/realign", key: "realign" },
  { to: "/viewer", key: "viewer" },
  { to: "/lookup", key: "lookup" },
  { to: "/docs", key: "docs" },
  { to: "/about", key: "about" }
] as const;

export function Header() {
  const { pathname } = useLocation();
  const workspace = /^\/(submit|realign|results|viewer|examples|lookup|jobs?)(\/|$)/.test(pathname);
  const { dictionary: d } = useLanguage();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav
      aria-label={d.common.primaryNavigation}
      className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-0.5"
    >
      {navItems.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cn(
              "rounded px-2.5 py-1.5 text-sm font-medium transition",
              isActive
                ? "bg-slate-100 text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            )
          }
          end={item.to === "/"}
          key={item.to}
          onClick={() => setOpen(false)}
          to={item.to}
        >
          {d.nav[item.key]}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className={cn("mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8", workspace && "workspace-navigation")}>
        <NavLink className="flex items-center gap-2" to="/">
          <img src={`${import.meta.env.BASE_URL}brand/easymsa-mark.svg`} width={36} height={36} className="h-9 w-9" alt="" />
          <span className="text-base font-semibold tracking-tight text-slate-950">easymsa</span>
        </NavLink>

        <div className="hidden items-center gap-2 lg:flex">
          {nav}
          <LanguageToggle />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageToggle />
          <Button
            aria-expanded={open}
            aria-label={open ? d.common.closeNavigation : d.common.openNavigation}
            className="h-9 w-9 px-0"
            onClick={() => setOpen((value) => !value)}
            size="sm"
            variant="ghost"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          {nav}
        </div>
      ) : null}
    </header>
  );
}
