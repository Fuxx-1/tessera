import type { ReactNode } from "react";
import { Avatar, AvatarGroup, Badge, Button, Card, Tag } from "../components/base";
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

export type AvatarDocProps = {
  showAnchors?: boolean;
};

export const avatarDocMeta = {
  title: "Avatar 头像",
  category: "基础组件",
  anchors: [
    { id: "avatar-when", label: "何时使用" },
    { id: "avatar-demos", label: "代码演示" },
    { id: "avatar-api", label: "API" },
    { id: "avatar-semantic", label: "Semantic DOM" },
    { id: "avatar-token", label: "Design Token" },
    { id: "avatar-a11y", label: "可访问性" },
    { id: "avatar-mobile", label: "移动端" },
    { id: "avatar-review", label: "专家结论" },
    { id: "avatar-coverage", label: "覆盖范围" },
  ],
} satisfies ComponentDocMeta;

const avatarImage = "/image-demo-workspace.svg";
const invalidAvatarPayload = "/index.html";

const demos: Demo[] = [
  {
    title: "图片、文本和图标 fallback",
    description: "Avatar 按 src、text、icon、fallback 顺序渲染。图片失败时会自动回到文本或备用内容。",
    preview: (
      <div className="doc-demo-row">
        <Avatar src={avatarImage} alt="Morgan Lee" />
        <Avatar text="Ada Lovelace" alt="Ada Lovelace" />
        <Avatar icon={<span aria-hidden="true">CL</span>} alt="Tessera Lab" />
        <Avatar fallback="AN" alt="Anonymous reviewer" />
        <Avatar src={invalidAvatarPayload} text="Broken Image" alt="Broken Image" />
        <Avatar src="javascript:alert(1)" text="Safe URL" alt="Unsafe source fallback" />
      </div>
    ),
    code: `<Avatar src={avatarImage} alt="Morgan Lee" />
<Avatar text="Ada Lovelace" alt="Ada Lovelace" />
<Avatar icon={<span aria-hidden="true">CL</span>} alt="Tessera Lab" />
<Avatar fallback="AN" alt="Anonymous reviewer" />
<Avatar src="/index.html" text="Broken Image" alt="Broken Image" />
<Avatar src="javascript:alert(1)" text="Safe URL" alt="Unsafe source fallback" />`,
  },
  {
    title: "尺寸与形状",
    description: "内置 xs/sm/md/lg/xl，并支持数字尺寸。square 使用 8px 内圆角，适合组织、项目和对象头像。",
    preview: (
      <div className="doc-demo-row avatar-doc-size-row">
        <Avatar size="xs" text="XS" alt="Extra small avatar" />
        <Avatar size="sm" text="SM" alt="Small avatar" />
        <Avatar size="md" text="MD" alt="Medium avatar" />
        <Avatar size="lg" text="LG" alt="Large avatar" />
        <Avatar size="xl" shape="square" text="XL" alt="Extra large square avatar" />
        <Avatar size={72} shape="square" text="72" alt="Custom size avatar" />
      </div>
    ),
    code: `<Avatar size="xs" text="XS" alt="Extra small avatar" />
<Avatar size="lg" text="LG" alt="Large avatar" />
<Avatar size="xl" shape="square" text="XL" alt="Extra large square avatar" />
<Avatar size={72} shape="square" text="72" alt="Custom size avatar" />`,
  },
  {
    title: "状态与徽标",
    description: "status 表示在线、忙碌、离开和离线；badge 用于小计数或团队标记，语义通过 ariaLabel 暴露。",
    preview: (
      <div className="doc-demo-row">
        <Avatar text="AM" alt="Ari Morgan" status="online" />
        <Avatar text="DN" alt="Dana Ng" status="busy" badge={{ content: 3, tone: "danger", ariaLabel: "3 mentions" }} />
        <Avatar text="Q" alt="Queue owner" status="away" badge={{ content: "QA", tone: "warning", ariaLabel: "QA reviewer" }} />
        <Avatar text="IV" alt="Inactive viewer" status="offline" />
      </div>
    ),
    code: `<Avatar text="AM" alt="Ari Morgan" status="online" />
<Avatar text="DN" alt="Dana Ng" status="busy" badge={{ content: 3, tone: "danger", ariaLabel: "3 mentions" }} />
<Avatar text="Q" alt="Queue owner" status="away" badge={{ content: "QA", tone: "warning", ariaLabel: "QA reviewer" }} />`,
  },
  {
    title: "头像组",
    description: "AvatarGroup 用重叠队列呈现团队成员，maxCount 会折叠为 +N，仍保持每个头像的 alt 或 aria-label。",
    preview: (
      <div className="doc-demo-row">
        <AvatarGroup maxCount={4} aria-label="Review team avatars">
          <Avatar src={avatarImage} alt="Morgan Lee" />
          <Avatar text="Ada Lovelace" alt="Ada Lovelace" />
          <Avatar text="Grace Hopper" alt="Grace Hopper" />
          <Avatar text="Katherine Johnson" alt="Katherine Johnson" />
          <Avatar text="Margaret Hamilton" alt="Margaret Hamilton" />
        </AvatarGroup>
      </div>
    ),
    code: `<AvatarGroup maxCount={4} aria-label="Review team avatars">
  <Avatar src={avatarImage} alt="Morgan Lee" />
  <Avatar text="Ada Lovelace" alt="Ada Lovelace" />
  <Avatar text="Grace Hopper" alt="Grace Hopper" />
  <Avatar text="Katherine Johnson" alt="Katherine Johnson" />
  <Avatar text="Margaret Hamilton" alt="Margaret Hamilton" />
</AvatarGroup>`,
  },
  {
    title: "列表与移动端不溢出",
    description: "头像固定尺寸，文本列 min-width: 0。窄屏卡片中姓名、描述和徽标会正常换行或省略。",
    preview: (
      <div className="avatar-doc-mobile-frame">
        <div className="avatar-doc-person">
          <Avatar text="Marina Chen" alt="Marina Chen" status="online" badge={{ content: 2, tone: "success", ariaLabel: "2 updates" }} />
          <div>
            <strong>Marina Chen</strong>
            <span>Responsible for a long-running incident response review</span>
          </div>
          <Badge status="success" text="Ready" />
        </div>
      </div>
    ),
    code: `<div className="avatar-doc-person">
  <Avatar text="Marina Chen" alt="Marina Chen" status="online" badge={{ content: 2, tone: "success", ariaLabel: "2 updates" }} />
  <div><strong>Marina Chen</strong><span>Responsible for a long-running incident response review</span></div>
  <Badge status="success" text="Ready" />
</div>`,
  },
];

const apiRows: DocRow[] = [
  { name: "src", value: "string", description: "头像图片地址。只接受相对地址、http、https、blob；危险协议会回到 fallback。" },
  { name: "srcSet", value: "string", description: "响应式图片资源集合。任一候选地址不安全时整组忽略。" },
  { name: "alt", value: "string", description: "图片替代文本，也是文字 fallback 的可访问名称来源。装饰性头像可传空字符串。" },
  { name: "text", value: "ReactNode", description: "文字头像内容。字符串会展示完整内容；仅 alt 存在时会自动生成最多两个首字母。" },
  { name: "icon", value: "ReactNode", description: "图标或简短符号 fallback，适合组织、机器人或匿名实体。" },
  { name: "fallback", value: "ReactNode", description: "最终兜底内容；未提供时显示 ?，避免断图后空白。" },
  { name: "size", value: '"xs" | "sm" | "md" | "lg" | "xl" | number', description: "头像尺寸。数字值会写入 --avatar-size，单位为 px。" },
  { name: "shape", value: '"circle" | "square"', description: "头像形状。默认 circle。" },
  { name: "status", value: '"none" | "online" | "busy" | "away" | "offline"', description: "右下角状态点。默认 none。" },
  { name: "badge", value: "ReactNode | AvatarBadgeConfig", description: "右上角小徽标，可传 tone、content、ariaLabel。" },
  { name: "imageProps", value: "ImgHTMLAttributes", description: "透传 img 属性，但 alt、src、srcSet、onError 由 Avatar 接管。" },
  { name: "onImageError", value: "ImgHTMLAttributes['onError']", description: "图片失败回调。Avatar 会先切换 fallback，再调用该回调。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLSpanElement>", description: "透传根 span 属性，例如 id、data-*、aria-*。" },
  { name: "AvatarGroup.children", value: "ReactNode", description: "头像组内容，通常由多个 Avatar 组成。" },
  { name: "AvatarGroup.maxCount", value: "number", description: "最多展示数量，超出后折叠为 +N。" },
  { name: "AvatarGroup.overlap", value: "number", description: "重叠距离，默认 10px。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "span.c-avatar", description: "固定正方形识别容器，承载尺寸、形状和定位上下文。" },
  { name: "body", value: "span.c-avatar__body", description: "裁切图片和 fallback，保证圆形与方形一致。" },
  { name: "image", value: "img.c-avatar__image", description: "真实图片节点，必须带 alt；失败后卸载并渲染 fallback。" },
  { name: "fallback", value: "span.c-avatar__fallback", description: "文字、图标或兜底内容。alt 存在时视觉 fallback 隐藏给读屏，避免重复。" },
  { name: "status", value: "span.c-avatar__status", description: "状态点带 role=status 和 aria-label。" },
  { name: "badge", value: "span.c-avatar__badge", description: "右上角徽标。无 ariaLabel 时作为装饰隐藏。" },
  { name: "group", value: "span.c-avatar-group", description: "头像组容器，使用隔离的重叠项，不改变单个 Avatar 语义。" },
];

const tokenRows: DocRow[] = [
  { name: "--avatar-size", value: "24 / 32 / 40 / 48 / 64px", description: "尺寸 token，也支持调用方传数字覆盖。" },
  { name: "surface", value: "#f0f0ee / #dededb", description: "中性头像底色和细边框，保持 neutral minimal 近白灰阶。" },
  { name: "foreground", value: "#1f1f1d / #555552", description: "文字 fallback 使用高对比灰黑，不使用蓝色主色。" },
  { name: "status colors", value: "green / red / amber / gray", description: "状态颜色只用于小点，不改变头像主体视觉层级。" },
  { name: "radius", value: "999px / 8px", description: "circle 为圆形，square 为 8px 圆角。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Image alt", value: "alt", description: "有语义的头像必须传可读名称；装饰性头像传 alt=\"\"。" },
  { name: "Broken image", value: "fallback", description: "断图后不会保留不可见图片，改用文本、图标或 fallback 继续表达身份。" },
  { name: "Status name", value: "role=status", description: "online、busy、away、offline 会暴露为状态；需要更业务化的文本时可在外层补充。" },
  { name: "Badge name", value: "badge.ariaLabel", description: "计数或团队标记建议传完整含义，例如 3 mentions。" },
  { name: "Safe URL", value: "src/srcSet guard", description: "拒绝 javascript、vbscript、data 和空地址，避免危险协议进入图片节点。" },
  { name: "Focus", value: "non-interactive", description: "Avatar 不可聚焦。用户菜单、资料页跳转应由外层 Button 或链接承担。" },
];

const mobileRows: DocRow[] = [
  { name: "No overflow", value: "inline-size: var(--avatar-size)", description: "头像不会被长姓名撑开，列表文本列需配合 min-width: 0。" },
  { name: "Badge bounds", value: "max-width: 26px", description: "徽标限制宽度并省略，避免小屏横向溢出。" },
  { name: "Touch target", value: "outer control", description: "头像本身不扩展触摸区域；可包在 Button 中获得 44px 触摸目标。" },
];

const reviewRows: DocRow[] = [
  { name: "产品", value: "通过", description: "Avatar 独立承载人、组织和对象识别；头像组、状态与小徽标覆盖常见协作场景。" },
  { name: "UI", value: "通过", description: "采用中性底色、细边、低饱和状态点，保持 neutral minimal 风格。" },
  { name: "研发", value: "通过", description: "无外部 UI 依赖，图片失败状态可复位，AvatarGroup 与 Badge/Image 文档解耦。" },
  { name: "测试", value: "通过", description: "验收关注 image/text/icon fallback、组、断图、alt、status/badge 和 375px/390px 宽度。" },
  { name: "白帽", value: "通过", description: "不暴露危险 HTML，过滤危险图片 URL，不吞掉 alt 语义；远端图片失败不会形成不可见身份。" },
];

const coverageRows: DocRow[] = [
  { name: "已覆盖", value: "image / text / icon / fallback / size / shape / status / badge / group", description: "满足本轮 Avatar 独立生产组件范围。" },
  { name: "不合并", value: "BadgeDoc / ImageDoc", description: "AvatarDoc 独立维护，不与 Badge 或 Image 文档混合。" },
  { name: "暂不支持", value: "draggable crop / upload", description: "裁剪上传和复杂图片预览属于后续 Image/Upload 专项。" },
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

export function AvatarDoc({ showAnchors = false }: AvatarDocProps) {
  return (
    <TutorialScaffold component="Avatar" kind="display" oneLineExample={`<Avatar name="Ada Lovelace" />`}>
    <section className="button-doc avatar-doc" aria-labelledby="avatar-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Avatar 文档目录">
            {avatarDocMeta.anchors.map((anchor) => <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>)}
          </aside>
        ) : null}
        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="avatar-doc-title">{avatarDocMeta.title}</h2>
            <p>展示用户、团队、机器人或对象的识别图形。Avatar 是独立基础组件，文档不与 Badge 或 Image 合并。</p>
          </header>

          <section className="button-doc-section" id="avatar-when" aria-labelledby="avatar-when-title">
            <h3 id="avatar-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要在列表、卡片、评论、负责人字段或协作工具中快速识别实体时使用。</li>
              <li>图片可能缺失或失败时，优先提供 text、icon 或 fallback，让身份表达不中断。</li>
              <li>不要把 Avatar 当作图片预览器或上传控件；复杂图片能力应由独立 Image/Upload 专项承担。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="avatar-demos" aria-labelledby="avatar-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="avatar-demos-title">代码演示</h3>
              <p>示例覆盖 image/text/icon fallback、尺寸、形状、状态、徽标、断图兜底和窄屏列表。</p>
            </div>
            <div className="button-doc-demo-grid">{demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}</div>
          </section>

          <section className="button-doc-section" id="avatar-api" aria-labelledby="avatar-api-title"><h3 id="avatar-api-title">API</h3><DataTable rows={apiRows} /></section>
          <section className="button-doc-section" id="avatar-semantic" aria-labelledby="avatar-semantic-title"><h3 id="avatar-semantic-title">Semantic DOM</h3><DataTable rows={semanticRows} /></section>
          <section className="button-doc-section" id="avatar-token" aria-labelledby="avatar-token-title"><h3 id="avatar-token-title">Design Token</h3><DataTable rows={tokenRows} /></section>
          <section className="button-doc-section" id="avatar-a11y" aria-labelledby="avatar-a11y-title"><h3 id="avatar-a11y-title">可访问性</h3><DataTable rows={accessibilityRows} /></section>
          <section className="button-doc-section" id="avatar-mobile" aria-labelledby="avatar-mobile-title"><h3 id="avatar-mobile-title">移动端</h3><DataTable rows={mobileRows} /></section>
          <section className="button-doc-section" id="avatar-review" aria-labelledby="avatar-review-title"><h3 id="avatar-review-title">五专家小组结论</h3><DataTable rows={reviewRows} /></section>
          <section className="button-doc-section" id="avatar-coverage" aria-labelledby="avatar-coverage-title"><h3 id="avatar-coverage-title">覆盖范围</h3><DataTable rows={coverageRows} /></section>

          <section className="button-doc-section" aria-labelledby="avatar-compose-title">
            <h3 id="avatar-compose-title">组合示例</h3>
            <div className="doc-demo-row">
              <Card title="Reviewer" description="Avatar composes with cards and badges without owning interaction.">
                <div className="avatar-doc-person">
                  <Avatar text="Talia Stone" alt="Talia Stone" status="online" />
                  <div>
                    <strong>Talia Stone</strong>
                    <span>Security review owner</span>
                  </div>
                  <Tag tone="success">ready</Tag>
                </div>
              </Card>
              <Button variant="ghost">Open profile</Button>
            </div>
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
