import {useLanguage} from '../../lib/i18n/useLanguage';
import {refinementText} from '../../lib/i18n/refinements';
import {useNamedDownload} from '../../lib/hooks/useNamedDownload';
export function NamedDownload({href,name,label}:{href:string;name:string;label:string}) {
  const {locale}=useLanguage(), t=refinementText[locale]; const {busy,failed,download,cancel}=useNamedDownload(href);
  return <div><button type="button" disabled={!!busy} onClick={()=>void download({href,name})}>{busy?t.downloading:label}</button>
    {busy&&<button type="button" onClick={cancel}>{t.cancel}</button>}
    {failed&&<p role="alert">{t.downloadFailed}</p>}
  </div>;
}
