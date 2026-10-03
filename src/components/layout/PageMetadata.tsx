import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function PageMetadata() {
  const location = useLocation();
  const { dictionary, locale } = useLanguage();

  useEffect(() => {
    const labels: Array<[RegExp, string]> = [
      [/^\/$/, dictionary.nav.home],
      [/^\/submit/, dictionary.nav.submit],
      [/^\/viewer/, dictionary.nav.viewer],
      [/^\/lookup/, dictionary.nav.lookup],
      [/^\/job\//, dictionary.job.title],
      [/^\/results\//, dictionary.common.viewResults],
      [/^\/docs/, dictionary.nav.docs],
      [/^\/examples/, dictionary.nav.examples],
      [/^\/license/, locale === "zh" ? "许可" : "License"],
      [/^\/privacy/, locale === "zh" ? "隐私与本地存储" : "Privacy and storage"],
      [/^\/realign/, dictionary.nav.realign],
      [/^\/about/, dictionary.nav.about]
    ];
    const label = labels.find(([pattern]) => pattern.test(location.pathname))?.[1];
    document.title = label
      ? `${label} · ${dictionary.common.appName}`
      : dictionary.common.appName;

    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    if (description) {
      description.content = dictionary.home.subtitle;
    }
  }, [dictionary, locale, location.pathname]);

  return null;
}
