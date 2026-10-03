import { useEffect, useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { browserStorage } from "../../lib/storage";
export function StorageNotice() {
  const { locale } = useLanguage();
  const [unavailable, setUnavailable] = useState(!browserStorage());
  useEffect(() => {
    const handler = () => setUnavailable(true);
    window.addEventListener("easymsa-storage-unavailable", handler);
    return () =>
      window.removeEventListener("easymsa-storage-unavailable", handler);
  }, []);
  if (!unavailable) return null;
  return (
    <p
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-950"
    >
      {locale === "zh"
        ? "浏览器无法保存本地记录。请保存任务恢复链接或下载访问凭证；关闭页面后可能无法恢复任务。"
        : "Browser storage is unavailable. Save your recovery link or download your access credentials before closing this page."}
    </p>
  );
}
