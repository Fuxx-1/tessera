import { useMemo, useState, type ReactNode } from "react";
import { Upload, type UploadChangeInfo, type UploadFileItem } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

export type UploadDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<Upload accept=".pdf,image/*" label="Review attachments" multiple />`;

type Demo = {
  title: string;
  description: string;
  preview: ReactNode;
  code: string;
};

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export const uploadDocMeta = {
  title: "Upload 上传",
  category: "数据录入",
  anchors: [
    { id: "upload-when", label: "何时使用" },
    { id: "upload-demos", label: "代码演示" },
    { id: "upload-api", label: "API" },
    { id: "upload-validation", label: "File validation" },
    { id: "upload-semantic", label: "Semantic DOM" },
    { id: "upload-token", label: "Design Token" },
    { id: "upload-a11y", label: "Accessibility" },
    { id: "upload-mobile", label: "Mobile" },
    { id: "upload-security", label: "Security" },
    { id: "upload-unsupported", label: "扩展建议" },
    { id: "upload-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const examplePdf = new File(["brief"], "project-brief.pdf", {
  type: "application/pdf",
  lastModified: 1_727_510_400_000,
});
const exampleImage = new File(["avatar"], "team-photo.png", {
  type: "image/png",
  lastModified: 1_727_510_401_000,
});
const largeImage = new File(["large-preview"], "large-visual-map.png", {
  type: "image/png",
  lastModified: 1_727_510_402_000,
});
const unsafeNameFile = new File(["not executable"], "<script>alert(1)</script>.txt", {
  type: "text/plain",
  lastModified: 1_727_510_403_000,
});
const reportCsv = new File(["rows"], "quarterly-report.csv", {
  type: "text/csv",
  lastModified: 1_727_510_404_000,
});
const longNameFile = new File(["long-name"], "customer-evidence-package-with-a-very-long-filename-that-must-wrap-without-breaking-mobile-layout.pdf", {
  type: "application/pdf",
  lastModified: 1_727_510_405_000,
});

function makeDemoFile(
  file: File,
  status: UploadFileItem["status"] = "ready",
  message?: string,
  progress?: number,
): UploadFileItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    status,
    message,
    progress,
    ...(status === "rejected" ? { reason: "maxSize" as const } : {}),
  };
}

function ControlledUploadDemo() {
  const [files, setFiles] = useState<UploadFileItem[]>(() => [makeDemoFile(examplePdf)]);
  const [lastSource, setLastSource] = useState<UploadChangeInfo["source"]>("input");

  return (
    <div className="doc-demo-stack">
      <Upload
        accept=".pdf,image/*"
        description="PDF or image files only. This demo keeps files in local React state."
        files={files}
        label="Controlled document intake"
        maxSize={1024 * 1024}
        multiple
        onChange={(info) => {
          setFiles(info.files);
          setLastSource(info.source);
        }}
      />
      <p className="upload-doc-note">Last local change source: {lastSource}</p>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础选择",
    description: "保留原生 file input，点击区域和键盘 Enter/Space 都会打开系统文件选择器。",
    preview: (
      <div className="doc-demo-stack">
        <Upload description="Choose one local file. The component does not upload it." label="Attach a file" />
      </div>
    ),
    code: `<Upload label="Attach a file" description="Choose one local file. The component does not upload it." />`,
  },
  {
    title: "多文件与拖放",
    description: "dropzone 是增强入口；移动端仍以系统文件选择为主路径。",
    preview: (
      <div className="doc-demo-stack">
        <Upload
          defaultFiles={[makeDemoFile(examplePdf), makeDemoFile(exampleImage), makeDemoFile(longNameFile)]}
          description="Drop files here or choose from the system picker."
          label="Review attachments"
          multiple
        />
      </div>
    ),
    code: `<Upload multiple label="Review attachments" description="Drop files here or choose from the system picker." />`,
  },
  {
    title: "本地进度展示",
    description: "progress 只展示业务传入的本地状态；Upload 不创建请求、不轮询、不自动上传。",
    preview: (
      <div className="doc-demo-stack">
        <Upload
          defaultFiles={[makeDemoFile(reportCsv, "uploading", "", 64), makeDemoFile(examplePdf, "done", "", 100)]}
          description="Progress is display-only and can be driven by a parent form."
          label="Local progress list"
          multiple
        />
      </div>
    ),
    code: `<Upload defaultFiles={[{ ...item, status: "uploading", progress: 64 }]} label="Local progress list" />`,
  },
  {
    title: "accept 与 maxSize",
    description: "组件自行校验 MIME、扩展名和大小，并把拒绝项展示在本地列表里。",
    preview: (
      <div className="doc-demo-stack">
        <Upload
          accept="image/*,.pdf"
          defaultFiles={[
            makeDemoFile(exampleImage),
            makeDemoFile(largeImage, "rejected", "large-visual-map.png is larger than the maximum file size."),
          ]}
          description="Images or PDF, up to 1 MB each."
          label="Validated local files"
          maxCount={1}
          maxSize={1024 * 1024}
          multiple
        />
      </div>
    ),
    code: `<Upload accept="image/*,.pdf" maxCount={1} maxSize={1024 * 1024} multiple label="Validated local files" description="Images or PDF, up to 1 MB each." />`,
  },
  {
    title: "一行样例",
    description: "最小可复制用法保持一行，便于表单或弹窗内快速接入。",
    preview: (
      <div className="doc-demo-stack">
        <Upload accept=".csv" description="CSV only; still local-only." label="Import CSV" />
      </div>
    ),
    code: `<Upload accept=".csv" label="Import CSV" description="CSV only; still local-only." />`,
  },
  {
    title: "安全文件名",
    description: "文件名按 React 文本节点展示；即使包含尖括号或脚本片段，也不会作为 HTML 注入。",
    preview: (
      <div className="doc-demo-stack">
        <Upload
          defaultFiles={[makeDemoFile(unsafeNameFile)]}
          description="Filename text is rendered as text, never as HTML."
          label="Inspect filename rendering"
        />
      </div>
    ),
    code: `<Upload defaultFiles={[unsafeNameFile]} label="Inspect filename rendering" description="Filename text is rendered as text, never as HTML." />`,
  },
  {
    title: "受控文件列表",
    description: "files/onChange 可由业务表单接管；Upload 只返回本地 File 对象和校验状态。",
    preview: <ControlledUploadDemo />,
    code: `const [files, setFiles] = useState<UploadFileItem[]>([]); <Upload files={files} multiple onChange={(info) => setFiles(info.files)} />`,
  },
  {
    title: "禁用状态",
    description: "disabled 会同时关闭选择、键盘触发、拖放和移除操作。",
    preview: (
      <div className="doc-demo-stack">
        <Upload
          defaultFiles={[makeDemoFile(examplePdf)]}
          description="File changes are locked while the record is archived."
          disabled
          label="Archived evidence"
        />
      </div>
    ),
    code: `<Upload disabled label="Archived evidence" description="File changes are locked while the record is archived." />`,
  },
];

const apiRows: DocRow[] = [
  { name: "accept", value: "string", description: "传给原生 input 的 accept，同时用于本地 MIME、通配符和扩展名校验。" },
  { name: "maxCount", value: "number", description: "最多接受的文件数量；超出项进入 rejected 状态，不静默丢弃。multiple=false 时默认最多接受 1 个。" },
  { name: "maxSize", value: "number", description: "单个文件最大字节数。超过后进入 rejected 状态，不静默丢弃。" },
  { name: "multiple", value: "boolean", description: "是否允许多文件。false 时选择或拖放只保留第一个文件。" },
  { name: "files", value: "UploadFileItem[]", description: "受控文件列表。File 对象不可序列化，持久化时应转换为业务元数据；progress 仅用于本地展示。" },
  { name: "defaultFiles", value: "UploadFileItem[]", description: "非受控初始文件列表，用于已有附件或 demo 状态。" },
  { name: "onChange", value: "(info) => void", description: "本地选择、拖放或移除后的回调。不会自动发起网络请求。" },
  { name: "onRemove", value: "(file) => void", description: "移除某个文件前触发，适合记录审计或业务确认。" },
  { name: "inputProps", value: "InputHTMLAttributes", description: "透传到隐藏的原生 file input，不允许覆盖 type、value、accept、multiple、disabled、onChange。" },
  { name: "rejectMessages", value: "Partial<Record<reason, fn>>", description: "自定义 accept 或 maxSize 拒绝文案。" },
  { name: "removeButtonText", value: "ReactNode", description: "移除按钮的可见短文案，默认 Remove；可访问名称仍由 removeLabel 生成。" },
  { name: "removeLabel", value: "(file) => string", description: "为每个移除按钮生成可访问名称，默认包含文件名。" },
];

const validationRows: DocRow[] = [
  { name: "accept", value: "客户端提示", description: "支持 .ext、image/*、application/pdf 等规则；浏览器提示之外仍由组件二次校验。" },
  { name: "maxCount", value: "客户端拦截", description: "按当前 accepted 数量判断，超出数量的文件留在列表里并显示数量限制错误。" },
  { name: "maxSize", value: "客户端拦截", description: "按 File.size 判断，拒绝项保留在列表中并通过 live region 宣告。" },
  { name: "network", value: "none", description: "组件不提供 action/uploadUrl/request，也不调用 fetch、XHR 或 FormData。" },
  { name: "content", value: "not read", description: "组件不使用 FileReader、不生成 object URL、不读取或预览文件内容。" },
  { name: "progress", value: "display only", description: "上传进度由业务传入；基础组件只渲染 role=progressbar，不推断网络状态。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div.c-upload", description: "上传控件容器，承载受控或非受控的本地文件状态。" },
  { name: "input", value: "input[type=file].c-upload__input", description: "真实原生文件输入，保留系统 picker、表单、accept、multiple、disabled 能力。" },
  { name: "dropzone", value: "div[role=button].c-upload__dropzone", description: "点击、键盘和拖放入口，通过 aria-labelledby / aria-describedby 与文案关联。" },
  { name: "status", value: "div[role=status]", description: "用 aria-live=polite 宣告文件数量和拒绝状态变化。" },
  { name: "progress", value: "span[role=progressbar]", description: "当文件提供 progress 时展示 0-100 的本地进度，不绑定任何请求。" },
  { name: "list", value: "ul/li", description: "选择文件列表，每项展示文件名、大小、类型、错误和移除按钮。" },
];

const tokenRows: DocRow[] = [
  { name: "dropzoneMinHeight", value: "92px", description: "桌面和移动端都提供明显可点区域。" },
  { name: "touchTarget", value: ">= 44px on coarse pointer", description: "移动端入口和移除按钮保证触控面积。" },
  { name: "border", value: "#dededb / #c8c8c3", description: "细边框与虚线边框保持中性视觉。" },
  { name: "danger", value: "#7f1d1d", description: "拒绝项错误文本颜色。" },
  { name: "progress", value: "#555552 on #ededeb", description: "中性进度条，避免把上传状态误读为品牌成功色。" },
  { name: "radius", value: "8px", description: "dropzone 和文件项圆角。" },
  { name: "surface", value: "#fbfbfa / #ffffff", description: "上传入口和文件项背景。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "定位为本地文件选择与校验组件，不承诺真实上传、断点续传或预览。" },
  { name: "UI 专家", value: "通过", description: "dropzone、列表、拒绝态、进度条、禁用态和移动端触控尺寸保持一致。" },
  { name: "研发专家", value: "通过", description: "自有 React 实现，无 antd 系依赖；受控/非受控、拖放、键盘和移除路径可组合。" },
  { name: "测试专家", value: "通过", description: "专项 smoke 覆盖 #upload 路由、文件选择、drop、accept/maxSize、progress、mobile 和安全文件名。" },
  { name: "白帽专家", value: "通过", description: "不读取内容、不创建 object URL、不发网络请求，文件名作为文本节点渲染。" },
];

const unsupportedRows: DocRow[] = [
  { name: "自动上传", value: "不支持", description: "基础 Upload 不封装网络上传。业务可在 onChange 中显式调用自有上传服务。" },
  { name: "预览缩略图", value: "不支持", description: "当前不读取文件内容，也不生成 object URL。预览应由明确的业务组件承担。" },
  { name: "目录上传", value: "暂不支持", description: "目录路径、webkitdirectory 和拖放目录需要额外安全边界与兼容性验证。" },
  { name: "capture / paste", value: "暂不支持", description: "移动端拍摄和剪贴板上传不作为默认承诺，后续可独立扩展。" },
];

const faqItems = [
  {
    question: "Upload 会像某些组件库一样自动上传吗？",
    answer: "不会。当前 Upload 是本地文件选择组件，默认只维护文件列表和校验状态，不调用任何网络 API。",
  },
  {
    question: "accept 和 maxSize 能保证安全吗？",
    answer: "不能。它们只改善前端交互，服务端仍必须重新校验 MIME、扩展名、大小、内容和权限。",
  },
  {
    question: "为什么拒绝文件还显示在列表里？",
    answer: "静默丢弃会让用户不知道发生了什么。保留 rejected 项可以展示原因，并通过 aria-live 告知辅助技术。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview button-doc-demo__preview--field">{preview}</div>
      <pre className="button-doc-code" aria-label={`${title} 代码`}>
        <code>{code}</code>
      </pre>
    </article>
  );
}

function DataTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th scope="col">名称</th>
            <th scope="col">值</th>
            <th scope="col">说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <code>{row.name}</code>
              </td>
              <td>
                <code>{row.value}</code>
              </td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UploadDoc({ showAnchors = false }: UploadDocProps) {
  const acceptanceRows = useMemo(
    () => [
      "原生 input[type=file]、dropzone、文件列表、移除按钮均可用。",
      "accept 与 maxSize 有本地校验和可见错误，不静默丢弃。",
      "progress 是业务传入的展示字段；默认不网络上传、不读取文件内容、不生成 object URL。",
      "键盘、aria-live、disabled、移动端触控尺寸和文件名文本渲染通过 smoke。",
      "安全文件名样例直接展示尖括号文件名，证明文档页没有 HTML 注入。",
      "未引入 antd、antd-mobile、@ant-design/charts。",
    ],
    [],
  );

  return (
    <TutorialScaffold component="Upload" kind="data-entry" oneLineExample={oneLineExample}>
    <section className="button-doc upload-doc" aria-labelledby="upload-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Upload 文档目录">
            {uploadDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="upload-doc-title">{uploadDocMeta.title}</h2>
            <p>
              用于选择本地文件、呈现文件列表和校验结果。当前 Upload 是自有基础组件，不默认上传、不读取文件内容，
              也不依赖任何 antd 系 UI 包。
            </p>
          </header>

          <section className="button-doc-section" id="upload-when" aria-labelledby="upload-when-title">
            <h3 id="upload-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要在表单、审核流或资料收集中选择一个或多个本地文件时使用。</li>
              <li>需要在提交前展示文件名、大小、类型和客户端校验结果时使用。</li>
              <li>需要自动上传、预览内容、断点续传或服务端扫描时，应在业务层显式编排，不放进基础 Upload 默认行为。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="upload-demos" aria-labelledby="upload-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="upload-demos-title">代码演示</h3>
              <p>覆盖基础选择、dropzone、多文件、accept/maxSize、本地移除、受控状态和禁用状态。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard {...demo} key={demo.title} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="upload-api" aria-labelledby="upload-api-title">
            <h3 id="upload-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="upload-validation" aria-labelledby="upload-validation-title">
            <h3 id="upload-validation-title">File validation</h3>
            <DataTable rows={validationRows} />
          </section>

          <section className="button-doc-section" id="upload-semantic" aria-labelledby="upload-semantic-title">
            <h3 id="upload-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="upload-token" aria-labelledby="upload-token-title">
            <h3 id="upload-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="upload-a11y" aria-labelledby="upload-a11y-title">
            <h3 id="upload-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>真实 file input 保留在 DOM 中；dropzone 通过 role=button、tabIndex、Enter/Space 提供键盘入口。</li>
              <li>说明文本、状态文本和错误结果会通过 aria-describedby 与 aria-live=polite 参与读屏反馈。</li>
              <li>文件列表使用 ul/li；每个 remove 是原生 button，默认名称包含具体文件名。</li>
              <li>disabled 时选择、键盘触发、拖放和移除均不会改变状态。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="upload-mobile" aria-labelledby="upload-mobile-title">
            <h3 id="upload-mobile-title">Mobile</h3>
            <ul className="button-doc-list">
              <li>移动端不依赖拖拽；系统文件选择器是主要入口。</li>
              <li>coarse pointer 下 dropzone 和 remove 的触控目标加大，文件列表单列展示。</li>
              <li>文件名允许换行，长文件名不会把移除按钮挤出视口。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="upload-security" aria-labelledby="upload-security-title">
            <h3 id="upload-security-title">Security</h3>
            <ul className="button-doc-list">
              <li>Upload 不调用 fetch、XMLHttpRequest、FormData，也不执行自动上传或删除请求。</li>
              <li>组件不使用 FileReader，不生成 URL.createObjectURL，不渲染文件内容。</li>
              <li>文件名只作为 React 文本节点展示，不使用 dangerouslySetInnerHTML。</li>
              <li>Dropzone 只处理真实 FileList；HTML、URL、文本拖放数据不会被读取。</li>
              <li>accept/maxSize 只做客户端提示和交互拦截，服务端仍必须重新验证类型、大小、内容和权限。</li>
            </ul>
          </section>

          <section className="button-doc-section" aria-labelledby="upload-review-title">
            <h3 id="upload-review-title">五专家复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="upload-unsupported" aria-labelledby="upload-unsupported-title">
            <h3 id="upload-unsupported-title">扩展建议</h3>
            <DataTable rows={unsupportedRows} />
          </section>

          <section className="button-doc-section" aria-labelledby="upload-acceptance-title">
            <h3 id="upload-acceptance-title">验收口径</h3>
            <ul className="button-doc-list">
              {acceptanceRows.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
          </section>

          <section className="button-doc-section" id="upload-faq" aria-labelledby="upload-faq-title">
            <h3 id="upload-faq-title">FAQ</h3>
            <div className="button-doc-faq">
              {faqItems.map((item) => (
                <article key={item.question}>
                  <h4>{item.question}</h4>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
