import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { methods } from "../lib/methods";
import mit from "../../LICENSE?raw";
export function LicensePage() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  return (
    <PageContainer className="space-y-8">
      <h1 className="text-4xl font-semibold">
        {zh ? "使用与许可" : "Use and licensing"}
      </h1>
      <section className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50 p-6">
        <h2 className="text-2xl font-semibold">
          {zh ? "所有用途免费开放" : "Free for all uses"}
        </h2>
        <p className="leading-7">
          {zh
            ? "在线服务对学术、非商业和商业用途均免费，无需注册，邮箱可选。所有用户适用相同的输入、队列和资源限制；可用性依赖服务器容量。"
            : "The online service is free for academic, non-commercial and commercial use. Registration is not required; email is optional. The same input, queue and resource limits apply to all users; availability depends on server capacity."}
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">
          {zh
            ? "EasyMSA 自有代码与材料"
            : "Original EasyMSA code and materials"}
        </h2>
        <p className="text-sm leading-7">
          {zh
            ? "有权授权的自有前后端代码、原创文档及本轮合成教学数据与说明采用 MIT，可免费使用、修改和再分发，并须保留标准许可要求的声明。已有算法、第三方代码及衍生补丁保留原许可；不是所有内容都采用 MIT。"
            : "Authorized original frontend/backend code, original documentation and the synthetic teaching data and explanatory materials in this release use MIT. Use, modification and redistribution are permitted subject to its notice requirements. Existing algorithms, third-party code and derivative patches retain their original licenses; MIT does not cover everything."}
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-teal-800 underline">
          <a href="https://opensource.org/license/mit">
            MIT (Open Source Initiative)
          </a>
          <a download href={`${import.meta.env.BASE_URL}legal/MIT.txt`}>
            {zh ? "下载完整 MIT 文本" : "Download MIT text"}
          </a>
          <a href={`${import.meta.env.BASE_URL}legal/license-scope.md`}>
            {zh ? "许可范围与例外" : "Scope and exceptions"}
          </a>
        </div>
        <pre className="whitespace-pre-wrap break-words rounded-xl border bg-white p-5 text-xs leading-6">
          {mit}
        </pre>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">
          {zh ? "算法与第三方许可" : "Algorithms and third-party licenses"}
        </h2>
        <p className="text-sm leading-7">
          {zh
            ? "ReAlign-N 及其衍生补丁保留 GPL v3。下表是工具主许可索引；内置组件须同时遵守各自声明。部署版本列于此处，源代码原始许可始终适用。"
            : "ReAlign-N and its derivative patches retain GPL v3. This table indexes principal tool licenses; bundled components also retain their own notices. Deployment versions are listed here; upstream terms continue to apply."}
        </p>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {[
                  zh ? "工具" : "Tool",
                  zh ? "版本" : "Version",
                  zh ? "许可" : "License",
                ].map((h) => (
                  <th className="p-3" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.name} className="border-t">
                  <td className="p-3">
                    <a className="text-teal-800 underline" href={m.source}>
                      {m.name}
                    </a>
                  </td>
                  <td className="p-3">{m.version}</td>
                  <td className="p-3">
                    <a className="text-teal-800 underline" href={m.licenseUrl}>
                      {m.license}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-teal-800 underline">
          <a href={`${import.meta.env.BASE_URL}legal/third-party-notices.md`}>
            {zh ? "完整第三方清单与声明" : "Third-party inventory and notices"}
          </a>
          <a
            href={`${import.meta.env.BASE_URL}legal/frontend-dependencies.json`}
          >
            {zh ? "前端依赖清单" : "Frontend dependency inventory"}
          </a>
          <a
            href={`${import.meta.env.BASE_URL}legal/backend-dependencies.json`}
          >
            {zh ? "后端依赖清单" : "Backend dependency inventory"}
          </a>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">
          {zh ? "用户数据与引用" : "User data and citations"}
        </h2>
        <p className="text-sm leading-7">
          {zh
            ? "上传和结果数据不会因使用 EasyMSA 自动公开或成为开源数据。学术工作中建议引用 EasyMSA 和实际使用的方法；引用建议与许可证义务分别适用。EasyMSA 论文尚无已核验的 DOI，因此目前请引用网站及所用软件版本。"
            : "Uploads and results do not automatically become public or open data. For academic work, please acknowledge EasyMSA and cite the methods actually used. Citation recommendations are distinct from license obligations. No verified EasyMSA article DOI is currently available; cite the website and software version used."}
        </p>
      </section>
    </PageContainer>
  );
}
