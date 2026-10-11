import { useHomeDemo } from "./HomeDemoProvider";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function HomeDemoFallback() {
  const { failed, retry } = useHomeDemo();
  const zh = useLanguage().locale === "zh";
  return <div className="home-benefits-fallback" role="status">
    <p>{failed ? zh ? "示例暂时无法加载。" : "The example could not be loaded." : zh ? "正在载入示例…" : "Loading the example…"}</p>
    {failed && <button type="button" className="home-text-link" onClick={retry}>{zh ? "重新加载" : "Try again"}</button>}
  </div>;
}
