import { Languages } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { Button } from "../common/Button";

export function LanguageToggle() {
  const { dictionary: d, locale, toggleLocale } = useLanguage();

  return (
    <Button
      aria-label={d.common.toggleLanguage}
      className="app-language-toggle h-11 px-3 lg:h-9"
      onClick={toggleLocale}
      size="sm"
      variant="outline"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="sm:hidden">{locale === "zh" ? "中文" : "EN"}</span>
      <span className="hidden sm:inline">{locale === "zh" ? "中文 / EN" : "EN / 中文"}</span>
    </Button>
  );
}
