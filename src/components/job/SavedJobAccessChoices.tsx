import { Button } from "../common/Button";
import type { JobAccess } from "../../lib/api/tokens";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function savedKeyLabel(access: JobAccess, index: number, locale: string) {
  const masked = access.token.length > 8 ? `••••${access.token.slice(-4)}` : "••••";
  return `${locale === "zh" ? "访问密钥" : "Access key"} ${index + 1} · ${masked}`;
}

export function SavedJobAccessChoices({
  records,
  onSelect
}: {
  records: JobAccess[];
  onSelect: (access: JobAccess) => void;
}) {
  const { locale } = useLanguage();

  return (
    <section aria-labelledby="saved-access-heading" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold" id="saved-access-heading">
        {locale === "zh" ? "选择已保存的访问密钥" : "Choose a saved access key"}
      </h2>
      <p className="work-hint">
        {locale === "zh"
          ? "此任务号对应多条已保存记录。请选择要恢复的记录；选择后会验证访问密钥。"
          : "Several saved records use this job ID. Choose the record to restore; its access key will be checked."}
      </p>
      <ul className="space-y-3">
        {records.map((access, index) => {
          const date = new Date(access.createdAt);
          return (
            <li className="flex flex-wrap items-center gap-3" key={access.token}>
              <Button onClick={() => onSelect(access)} size="sm" type="button" variant="outline">
                {savedKeyLabel(access, index, locale)}
              </Button>
              {!Number.isNaN(date.getTime()) && (
                <time className="work-hint" dateTime={access.createdAt}>
                  {date.toLocaleString(locale === "zh" ? "zh-CN" : "en-GB")}
                </time>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
