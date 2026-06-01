import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { cn } from "../../lib/utils/cn";
import { Button } from "../common/Button";
import { LanguageToggle } from "./LanguageToggle";

const navItems = [
  { to: "/", key: "home" },
  { to: "/submit", key: "submit" },
  { to: "/viewer", key: "viewer" },
  { to: "/lookup", key: "lookup" },
  { to: "/examples", key: "examples" },
  { to: "/docs", key: "docs" },
  { to: "/about", key: "about" }
] as const;

export function Header() {
  const { dictionary: d } = useLanguage();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1 md:flex-row md:items-center md:gap-0.5">
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink className="flex items-center gap-3" to="/">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-950 font-mono text-xs font-bold text-white">
            em
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-950">easymsa</span>
        </NavLink>

        <div className="hidden items-center gap-2 md:flex">
          {nav}
          <LanguageToggle />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <Button
            aria-expanded={open}
            aria-label="Toggle navigation"
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
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          {nav}
        </div>
      ) : null}
    </header>
  );
}
