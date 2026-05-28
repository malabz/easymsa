import { Languages } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { Button } from "../common/Button";

export function LanguageToggle() {
  const { locale, toggleLocale } = useLanguage();

  return (
    <Button
      aria-label="Toggle language"
      className="h-9 px-3"
      onClick={toggleLocale}
      size="sm"
      variant="outline"
    >
      <Languages className="h-4 w-4" />
      <span>{locale === "zh" ? "中文 / EN" : "EN / 中文"}</span>
    </Button>
  );
}
