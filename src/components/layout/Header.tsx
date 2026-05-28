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
  { to: "/examples", key: "examples" },
  { to: "/docs", key: "docs" },
  { to: "/about", key: "about" }
] as const;

export function Header() {
  const { dictionary: d } = useLanguage();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1 md:flex-row md:items-center md:gap-1">
      {navItems.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cn(
              "rounded-md px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-teal-50 text-teal-800"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-950"
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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink className="flex items-center gap-3" to="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-800 font-mono text-sm font-bold text-white">
            em
          </span>
          <span className="text-lg font-semibold text-slate-950">easymsa</span>
        </NavLink>

        <div className="hidden items-center gap-3 md:flex">
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
        <div className="border-t border-slate-200 bg-white/90 px-4 py-3 md:hidden">
          {nav}
        </div>
      ) : null}
    </header>
  );
}
