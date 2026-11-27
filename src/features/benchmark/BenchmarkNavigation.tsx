import {Check,ChevronRight} from "lucide-react";
import {Link,useLocation} from "react-router-dom";
import {useLanguage} from "../../lib/i18n/useLanguage";
import {preloadRoute} from "../../lib/routePreload";
import "./workflow.css";
import "./report.css";
import "./controls.css";
import "./pages.css";

/** One navigation model for public results, submissions, examples and saved runs. */
export function BenchmarkNavigation(){
  const {locale}=useLanguage(),{pathname}=useLocation(),zh=locale==="zh";
  const section=pathname.includes("/submit")?"submit":/\/(recent|mine|runs)(\/|$)/.test(pathname)?"recent":"compare";
  return <nav className="benchmark-navigation" aria-label={zh?"Benchmark 导航":"Benchmark navigation"}>
    <span className="benchmark-navigation-title">Benchmark</span>
    <div>{[
      ["compare","/benchmark",zh?"方法对比":"Method comparison"],
      ["submit","/benchmark/submit",zh?"提交评测":"Submit program"],
      ["recent","/benchmark/recent",zh?"最近评测":"Recent evaluations"]
    ].map(([id,url,label])=><Link key={id} to={url} aria-current={section===id?"page":undefined} onFocus={()=>preloadRoute(url)} onPointerEnter={()=>preloadRoute(url)} onTouchStart={()=>preloadRoute(url)}>{label}</Link>)}</div>
  </nav>;
}

export function BenchmarkJourney({step=0,submitted=false,mode="full"}:{step?:0|1|2;submitted?:boolean;mode?:"quick"|"full"}){
  const {locale}=useLanguage(),zh=locale==="zh";
  const finalStep=mode==="quick"?(zh?"查看接入结果":"Check results"):(zh?"查看对比":"Compare results");
  const labels=submitted?(zh?["构建检查","运行数据集",finalStep]:["Build and check","Run datasets",finalStep]):(zh?["提交仓库","自动评测",finalStep]:["Submit repository","Automatic evaluation",finalStep]);
  return <ol className="benchmark-journey" aria-label={zh?"评测流程":"Evaluation workflow"}>
    {labels.map((label,index)=><li key={label} aria-current={step===index?"step":undefined} className={index<step?"is-done":""}>
      <span className="benchmark-journey-marker" aria-hidden="true">{index<step?<Check size={14}/>:index+1}</span>
      <span>{label}</span>{index<labels.length-1&&<ChevronRight className="benchmark-journey-arrow" size={16} aria-hidden="true"/>}
    </li>)}
  </ol>;
}
