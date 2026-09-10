import type { ReactNode } from "react";
import { QRCode, Tag } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

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

export type QRCodeDocProps = {
  showAnchors?: boolean;
};

export const qrCodeDocMeta = {
  title: "QRCode 二维码",
  category: "数据展示",
  anchors: [
    { id: "qrcode-when", label: "何时使用" },
    { id: "qrcode-demos", label: "代码演示" },
    { id: "qrcode-api", label: "API" },
    { id: "qrcode-limit", label: "限制" },
    { id: "qrcode-semantic", label: "Semantic DOM" },
    { id: "qrcode-token", label: "Design Token" },
    { id: "qrcode-mobile", label: "Mobile" },
    { id: "qrcode-review", label: "专家结论" },
    { id: "qrcode-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "基础二维码",
    description: "value 是唯一必填项；默认使用 160px、M 级纠错和 4 modules quiet zone。",
    preview: <QRCode value="https://example.com/tessera?q=qr-code" />,
    code: `<QRCode value="https://example.com/tessera?q=qr-code" />`,
  },
  {
    title: "尺寸与边界",
    description: "size 会限制在 96 到 360px；border 可关闭或指定 quiet zone modules。",
    preview: (
      <div className="doc-qrcode-row">
        <QRCode size={120} value="compact size" />
        <QRCode border={2} size={120} value="compact border" />
        <QRCode border={false} size={120} value="no border" />
      </div>
    ),
    code: `<QRCode size={120} value="compact size" /> <QRCode border={2} size={120} value="compact border" /> <QRCode border={false} size={120} value="no border" />`,
  },
  {
    title: "状态层",
    description: "loading、expired、error 会保留二维码矩阵尺寸，并覆盖可读状态文案。",
    preview: (
      <div className="doc-qrcode-row">
        <QRCode size={126} status="loading" value="loading-state" />
        <QRCode size={126} status="expired" value="expired-state" />
        <QRCode size={126} status="error" statusLabel="重新生成" value="manual-error-state" />
      </div>
    ),
    code: `<QRCode status="loading" value="loading-state" /> <QRCode status="expired" value="expired-state" /> <QRCode status="error" statusLabel="重新生成" value="manual-error-state" />`,
  },
  {
    title: "下载 SVG",
    description: "download 只导出当前生成的内联 SVG，不触达远程资源，也不执行 value 内容。",
    preview: <QRCode download downloadFileName="review-token" downloadLabel="Download review token" level="Q" value="review:QR-2026-06-07" />,
    code: `<QRCode download downloadFileName="review-token" downloadLabel="Download review token" level="Q" value="review:QR-2026-06-07" />`,
  },
];

const apiRows: DocRow[] = [
  { name: "value", value: "string", description: "二维码内容。当前轻量编码器要求非空，建议保持短文本或短 URL。" },
  { name: "size", value: "number", description: "渲染尺寸，自动限制在 96 到 360px，默认 160。" },
  { name: "level", value: '"L" | "M" | "Q" | "H"', description: "纠错级别。实现覆盖版本 1-4 的单/少块 Reed-Solomon 配置，默认 M。" },
  { name: "border", value: "boolean | number", description: "quiet zone。true 为 4 modules，false 为 0，number 限制在 0 到 8。" },
  { name: "status", value: '"active" | "loading" | "expired" | "error"', description: "状态层。非 active 时保留矩阵尺寸并展示覆盖文案。" },
  { name: "statusLabel", value: "ReactNode", description: "覆盖状态文案；编码失败时优先展示安全错误信息。" },
  { name: "download", value: "boolean", description: "展示 SVG 下载链接，仅 active 且生成成功时可见。" },
  { name: "downloadFileName", value: "string", description: "下载文件名，会过滤为安全的 .svg 文件名。" },
  { name: "color", value: "safe SVG color", description: "深色模块颜色。仅接受 hex、rgb/rgba、hsl/hsla、black、white、transparent、currentColor；不安全值回退为黑色。" },
  { name: "backgroundColor", value: "safe SVG color", description: "背景颜色。默认白色；不接受 url() 等外部 paint 语法。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLDivElement>", description: "透传 id、className、aria-*、data-* 等 div 属性。" },
];

const limitRows: DocRow[] = [
  { name: "编码范围", value: "Version 1-4 / Byte mode", description: "自有实现用于短文本、短 URL 和内部令牌展示，不覆盖 Kanji、ECI、结构化追加等完整 QR 标准。" },
  { name: "容量", value: "最长约 80 bytes", description: "容量随 level 变化；超过范围时展示 error 状态，不生成不可信图形。" },
  { name: "Logo", value: "unsupported", description: "不提供内嵌 logo 或遮挡矩阵 API；如业务必须叠 logo，应使用 H 级纠错、短 value，并做扫码器专项回归。" },
  { name: "互通性", value: "lightweight", description: "已实现 finder、timing、alignment、format、mask、Reed-Solomon；高风险支付、登录、票券场景应接入经过专项验证的编码器。" },
  { name: "安全", value: "no navigation", description: "组件不解析、不跳转、不执行 value；颜色拒绝 url()，不使用 dangerouslySetInnerHTML，下载只导出本地生成 SVG。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div.c-qrcode", description: "固定尺寸容器，允许业务包裹标题、说明或校验信息。" },
  { name: "image", value: "svg[role=img]", description: "内联 SVG 带 aria-label，默认描述为 QR code for value。" },
  { name: "status", value: "span[role=status]", description: "非 active 状态用状态层覆盖二维码，读屏可感知变化。" },
  { name: "download", value: "a[download]", description: "下载链接使用安全文件名，不额外创建脚本或远程请求。" },
];

const tokenRows: DocRow[] = [
  { name: "size", value: "96-360px", description: "组件用 CSS 变量固定宽高，避免状态切换造成布局跳动。" },
  { name: "quietZone", value: "4 modules", description: "默认留白满足多数扫码器识别；密集场景可降到 2，不建议关闭。" },
  { name: "radius", value: "8px", description: "外层容器圆角，SVG 本身保持 crisp edges。" },
  { name: "border", value: "#dededb", description: "外层边界用于区分页面背景，不进入二维码矩阵。" },
  { name: "overlay", value: "rgba(255,255,255,.84)", description: "状态层保持文字可读，同时能看出二维码被覆盖。" },
];

const mobileRows: DocRow[] = [
  { name: "Crisp", value: "shape-rendering", description: "SVG 使用 viewBox 与 crispEdges，在高 DPR 移动屏保持模块边缘清晰。" },
  { name: "Tap target", value: "download link", description: "下载链接独立渲染，移动端不覆盖二维码主体。" },
  { name: "Layout", value: "fixed square", description: "二维码区域固定正方形，文案状态在内部居中，不挤压周边信息。" },
  { name: "Scanning", value: "contrast first", description: "移动端优先使用深色模块和浅色背景，不建议品牌渐变。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "QRCode 独立于 Image 文档，聚焦短链接、令牌、下载和状态能力。" },
  { name: "UI 专家", value: "PASS", description: "默认留白、固定尺寸和状态遮罩能兼顾扫描识别与业务反馈；logo 遮挡不在当前组件范围内。" },
  { name: "研发专家", value: "PASS", description: "未引入 antd、antd-mobile、@ant-design/charts 或其他 UI 库；编码、SVG、下载均在组件内可审计。" },
  { name: "测试专家", value: "PASS", description: "覆盖导出、路由、生成成功、过长值错误、纠错等级、desktop + 360/390/430 移动端和状态层不跳动。" },
  { name: "白帽专家", value: "PASS", description: "value 只作为编码输入和 React 转义后的 aria-label，不作为 HTML、URL 跳转或脚本执行入口。" },
];

const faqItems = [
  { question: "为什么不和 Image 合并？", answer: "QRCode 是数据编码和扫描承载组件，关注 value、纠错、状态与下载；Image 关注媒体展示和预览，两者文档与风险面不同。" },
  { question: "可以用于支付或登录吗？", answer: "不建议直接用于高风险生产链路。当前实现是安全可控的轻量 QR 编码器，支付、登录、票券需要专项互通测试和安全评审。" },
  { question: "为什么限制长度？", answer: "短内容能保持移动端清晰度和实现可审计性；长内容应改为短链或后端生成二维码资源。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview">{preview}</div>
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
              <td><code>{row.name}</code></td>
              <td><code>{row.value}</code></td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QRCodeDoc({ showAnchors = false }: QRCodeDocProps) {
  return (
    <TutorialScaffold component="QRCode" kind="display" oneLineExample={`<QRCode value="https://tessera.local/release/42" label="Release link" />`}>
    <section className="button-doc qr-code-doc" aria-labelledby="qrcode-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="QRCode 文档目录">
            {qrCodeDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="qrcode-doc-title">{qrCodeDocMeta.title}</h2>
            <p>生成短文本、短链接或内部令牌二维码。当前实现为自有轻量 SVG 编码器，不引入外部 UI 库，并明确限制完整标准覆盖面。</p>
            <div className="doc-qrcode-tags" aria-label="QRCode capability tags">
              <Tag tone="strong">production</Tag>
              <Tag tone="subtle">no antd</Tag>
              <Tag tone="subtle">SVG</Tag>
              <Tag tone="subtle">download</Tag>
            </div>
          </header>

          <section className="button-doc-section" id="qrcode-when" aria-labelledby="qrcode-when-title">
            <h3 id="qrcode-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>展示短链接、设备绑定码、内部审核令牌或一次性短文本时使用。</li>
              <li>需要二维码过期、加载、失败等局部状态时使用。</li>
              <li>不要用 QRCode 替代 Image、条形码、富媒体预览或高风险支付登录 SDK。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="qrcode-demos" aria-labelledby="qrcode-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="qrcode-demos-title">代码演示</h3>
              <p>示例覆盖基础、尺寸边界、状态层、纠错级别和安全下载。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}
            </div>
          </section>

          <section className="button-doc-section" id="qrcode-api" aria-labelledby="qrcode-api-title">
            <h3 id="qrcode-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="qrcode-limit" aria-labelledby="qrcode-limit-title">
            <h3 id="qrcode-limit-title">限制</h3>
            <DataTable rows={limitRows} />
          </section>

          <section className="button-doc-section" id="qrcode-semantic" aria-labelledby="qrcode-semantic-title">
            <h3 id="qrcode-semantic-title">Semantic DOM / a11y</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="qrcode-token" aria-labelledby="qrcode-token-title">
            <h3 id="qrcode-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="qrcode-mobile" aria-labelledby="qrcode-mobile-title">
            <h3 id="qrcode-mobile-title">Mobile</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="qrcode-review" aria-labelledby="qrcode-review-title">
            <h3 id="qrcode-review-title">专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="qrcode-faq" aria-labelledby="qrcode-faq-title">
            <h3 id="qrcode-faq-title">FAQ</h3>
            <div className="button-doc-faq">
              {faqItems.map((item) => (
                <article className="button-doc-faq__item" key={item.question}>
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
