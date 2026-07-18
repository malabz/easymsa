import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function PageMetadata() {
  const location = useLocation();
  const { dictionary } = useLanguage();

  useEffect(() => {
    const labels: Array<[RegExp, string]> = [
      [/^\/$/, dictionary.nav.home],
      [/^\/submit/, dictionary.nav.submit],
      [/^\/viewer/, dictionary.nav.viewer],
      [/^\/lookup/, dictionary.nav.lookup],
      [/^\/job\//, dictionary.job.title],
      [/^\/results\//, dictionary.common.viewResults],
      [/^\/docs/, dictionary.nav.docs],
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
  }, [dictionary, location.pathname]);

  return null;
}
