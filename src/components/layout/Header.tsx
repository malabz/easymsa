import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const { dictionary: d } = useLanguage();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      headerRef.current?.querySelector<HTMLButtonElement>("#primary-navigation-toggle")?.focus();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  const nav = (
    <nav
      aria-label={d.common.primaryNavigation}
      className="app-navigation"
    >
      {navItems.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cn(
              "app-navigation-link rounded text-sm font-medium transition",
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
    <header ref={headerRef} onBlur={event => {
      if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} className="app-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="app-header-inner">
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
            aria-controls="mobile-primary-navigation"
            aria-label={open ? d.common.closeNavigation : d.common.openNavigation}
            className="h-11 w-11 px-0"
            id="primary-navigation-toggle"
            onClick={() => setOpen((value) => !value)}
            size="sm"
            variant="ghost"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <>
          <div aria-hidden="true" className="app-navigation-scrim lg:hidden" onClick={() => {
            setOpen(false);
            headerRef.current?.querySelector<HTMLButtonElement>("#primary-navigation-toggle")?.focus();
          }} />
          <div className="app-mobile-navigation lg:hidden" id="mobile-primary-navigation">
            {nav}
          </div>
        </>
      ) : null}
    </header>
  );
}
