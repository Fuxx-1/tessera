import { useState, type ReactNode } from "react";
import { Button, Switch } from "../components/base";
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

export type SwitchDocProps = {
  showAnchors?: boolean;
};

export const switchDocMeta = {
  title: "Switch 开关",
  category: "基础组件",
  anchors: [
    { id: "switch-when", label: "何时使用" },
    { id: "switch-demos", label: "代码演示" },
    { id: "switch-api", label: "API" },
    { id: "switch-a11y", label: "可访问性" },
    { id: "switch-semantic", label: "Semantic DOM" },
    { id: "switch-style", label: "样式边界" },
    { id: "switch-token", label: "Design Token" },
    { id: "switch-faq", label: "FAQ" },
    { id: "switch-experts", label: "五专家验收" },
  ],
} satisfies ComponentDocMeta;

function ControlledDemo() {
  const [checked, setChecked] = useState(true);

  return (
    <div className="doc-demo-row">
      <Switch checked={checked} label={checked ? "渲染已开启" : "渲染已关闭"} onCheckedChange={setChecked} />
      <span className="doc-demo-note">当前值：{checked ? "true" : "false"}</span>
    </div>
  );
}

function PreventableDemo() {
  const [checked, setChecked] = useState(false);

  return (
    <Switch
      checked={checked}
      label="需要外部确认后切换"
      onCheckedChange={setChecked}
      onClick={(event) => {
        if (!checked) {
          event.preventDefault();
        }
      }}
      onKeyDown={(event) => {
        if (!checked) {
          event.preventDefault();
        }
      }}
    />
  );
}

function OnChangeDemo() {
  const [checked, setChecked] = useState(false);

  return (
    <Switch
      checked={checked}
      checkedChildren="ON"
      label="即时提交"
      onChange={setChecked}
      unCheckedChildren="OFF"
    />
  );
}

function FormSubmitDemo() {
  const [submitted, setSubmitted] = useState("未提交");

  return (
    <form
      className="doc-demo-stack switch-doc-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setSubmitted(formData.get("releaseSync")?.toString() ?? "未提交");
      }}
    >
      <Switch
        defaultChecked
        helpText="选中时提交 releaseSync=enabled，未选中时不提交该字段。"
        label="发布同步"
        name="releaseSync"
        value="enabled"
      />
      <div className="doc-demo-row doc-demo-row--single-line">
        <Button size="sm" type="submit" variant="solid">
          提交
        </Button>
        <output className="doc-demo-note">FormData：{submitted}</output>
      </div>
    </form>
  );
}

const demos: Demo[] = [
  {
    title: "受控开关",
    description: "checked 与 onCheckedChange 组成受控模式，适合表单、设置面板和跨组件同步。",
    preview: <ControlledDemo />,
    code: `const [checked, setChecked] = useState(true); <Switch checked={checked} label={checked ? "渲染已开启" : "渲染已关闭"} onCheckedChange={setChecked} />`,
  },
  {
    title: "非受控默认值",
    description: "defaultChecked 用于只关心初始状态的轻量场景，组件内部会维护后续状态。",
    preview: <Switch defaultChecked label="自动保存" helpText="点击或按空格键会立即切换。" />,
    code: `<Switch defaultChecked label="自动保存" helpText="点击或按空格键会立即切换。" />`,
  },
  {
    title: "禁用与错误提示",
    description: "disabled 使用原生 button 禁用语义；error 会连接 aria-invalid 与帮助信息。",
    preview: (
      <div className="doc-demo-row">
        <Switch checked disabled label="组织策略已锁定" />
        <Switch error helpText="当前环境不允许开启该能力。" label="实验能力" />
      </div>
    ),
    code: `<><Switch checked disabled label="组织策略已锁定" /><Switch error helpText="当前环境不允许开启该能力。" label="实验能力" /></>`,
  },
  {
    title: "加载中",
    description: "loading 会设置 aria-busy 并暂时禁用切换，避免异步提交期间重复触发。",
    preview: (
      <div className="doc-demo-row">
        <Switch checked label="同步策略更新中" loading loadingLabel="同步策略更新中" />
        <Switch label="等待远端确认" loading loadingLabel="等待远端确认" />
      </div>
    ),
    code: `<Switch checked label="同步策略更新中" loading loadingLabel="同步策略更新中" />`,
  },
  {
    title: "尺寸",
    description: "size 只改变轨道、滑块和状态文字比例；移动触控目标仍保持至少 44px。",
    preview: (
      <div className="doc-demo-row">
        <Switch checked label="小尺寸" size="sm" />
        <Switch checked label="默认尺寸" size="md" />
        <Switch checked label="大尺寸" size="lg" />
      </div>
    ),
    code: `<Switch size="sm" label="小尺寸" /> <Switch size="md" label="默认尺寸" /> <Switch size="lg" label="大尺寸" />`,
  },
  {
    title: "状态文字",
    description: "checkedChildren 与 unCheckedChildren 只渲染纯 React 内容，适合短状态词；切换时可用 onChange 接收下一个 checked。",
    preview: (
      <div className="doc-demo-row">
        <OnChangeDemo />
        <Switch
          aria-label="转义状态文字"
          checkedChildren="<script>alert(1)</script>"
          defaultChecked
          unCheckedChildren="<img src=x onerror=alert(1)>"
        />
      </div>
    ),
    code: `<Switch checkedChildren="ON" unCheckedChildren="OFF" label="即时提交" onChange={setChecked} />`,
  },
  {
    title: "表单提交",
    description: "name/value/form 通过隐藏字段接入 FormData；未选中、disabled 或 loading 时不提交字段。",
    preview: <FormSubmitDemo />,
    code: `<Switch name="releaseSync" value="enabled" defaultChecked label="发布同步" />`,
  },
  {
    title: "无可见标签",
    description: "当界面只放置裸开关时，必须提供 aria-label 或 aria-labelledby。",
    preview: <Switch aria-label="开启移动端预览" defaultChecked />,
    code: `<Switch aria-label="开启移动端预览" defaultChecked />`,
  },
  {
    title: "窄屏长标签",
    description: "根节点保留 44px 触控高度，长标签会在容器内换行而不是撑破布局。",
    preview: (
      <div className="doc-demo-narrow">
        <Switch label="在移动端预览中启用自动保存和实时渲染" defaultChecked />
      </div>
    ),
    code: `<div className="doc-demo-narrow"><Switch label="在移动端预览中启用自动保存和实时渲染" defaultChecked /></div>`,
  },
  {
    title: "可拦截切换",
    description: "鼠标路径可用 onClick 拦截；键盘路径可用 onKeyDown 拦截。",
    preview: <PreventableDemo />,
    code: `<Switch checked={checked} label="需要外部确认后切换" onCheckedChange={setChecked} onClick={(event) => { if (!checked) event.preventDefault(); }} onKeyDown={(event) => { if (!checked) event.preventDefault(); }} />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "checked",
    value: "boolean",
    description: "受控状态。传入后组件显示完全由调用方状态决定。",
  },
  {
    name: "defaultChecked",
    value: "boolean",
    description: "非受控初始状态。后续点击与键盘激活会更新组件内部状态。",
  },
  {
    name: "onCheckedChange",
    value: "(checked: boolean) => void",
    description: "状态变化回调。受控和非受控模式都会触发。",
  },
  {
    name: "onChange",
    value: "(checked: boolean, event) => void",
    description: "状态变化回调别名，第二个参数保留触发的点击或键盘事件；disabled/loading 不会触发。",
  },
  {
    name: "label",
    value: "string",
    description: "可见标签，同时作为无 aria-label 时的可访问名称来源。不要和 aria-label 表达不同含义。",
  },
  {
    name: "checkedChildren / unCheckedChildren",
    value: "ReactNode",
    description: "轨道内短状态文字。通过 React children 渲染，不使用 dangerouslySetInnerHTML；长内容会在轨道内截断。",
  },
  {
    name: "size",
    value: '"sm" | "md" | "lg"',
    description: "尺寸档位。只影响轨道、滑块和轨道内状态文字，根按钮触控高度仍不低于 44px。",
  },
  {
    name: "loading",
    value: "boolean",
    description: "加载状态。组件设置 aria-busy、禁用点击/键盘/触控切换，并保留当前 checked 视觉。",
  },
  {
    name: "loadingLabel",
    value: "string",
    description: "加载状态的屏幕阅读器文本，默认 Loading switch。建议描述正在等待的业务动作。",
  },
  {
    name: "helpText",
    value: "ReactNode",
    description: "辅助说明，会通过 aria-describedby 连接到 switch 根按钮。组件不净化 ReactNode，只传入可信内容。",
  },
  {
    name: "error",
    value: "boolean",
    description: "错误状态。设置 aria-invalid 并切换错误视觉。",
  },
  {
    name: "ButtonHTMLAttributes",
    value: "ButtonHTMLAttributes<HTMLButtonElement>",
    description: "继承原生 button 属性，例如 disabled、aria-label、aria-labelledby、form、name、value、onClick、onKeyDown；role、type、aria-checked、aria-invalid 由组件内部维护。",
  },
  {
    name: "name / value / form",
    value: "string",
    description: "选中时渲染隐藏字段参与 FormData，value 默认 on；未选中、disabled 或 loading 时不提交字段，form 可关联外部表单 id。",
  },
];

const a11yRows: DocRow[] = [
  {
    name: "键盘",
    value: "Enter / Space",
    description: "Enter 与 Space 显式切换状态，并忽略重复按键；调用方可用 onKeyDown preventDefault 拦截键盘切换。",
  },
  {
    name: "aria-checked",
    value: "true / false",
    description: "每次状态变化都会同步到 role=switch 的 aria-checked。",
  },
  {
    name: "可访问名称",
    value: "label / aria-label / aria-labelledby",
    description: "有 label 时自动关联；没有可见标签时必须由调用方提供 aria-label 或 aria-labelledby。",
  },
  {
    name: "disabled",
    value: "native disabled",
    description: "使用原生 disabled，禁用后鼠标和键盘都不能触发 onCheckedChange 或 onChange。",
  },
  {
    name: "loading",
    value: "aria-busy + disabled",
    description: "加载时根按钮同步 aria-busy，并进入禁用路径；状态文本使用屏幕阅读器专用节点提供。",
  },
  {
    name: "focus",
    value: "focus-visible",
    description: "键盘聚焦时保留 2px 可见轮廓；鼠标点击不会强制显示焦点环。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "button[role=switch]",
    description: "组件根交互元素。保留 button 的焦点、禁用和键盘基础行为。",
  },
  {
    name: "track",
    value: ".c-switch__track",
    description: "开关轨道，只承担视觉表达，不暴露额外交互角色。",
  },
  {
    name: "state",
    value: ".c-switch__state",
    description: "轨道内短状态文字，aria-hidden，避免与按钮可访问名称重复。",
  },
  {
    name: "thumb",
    value: ".c-switch__thumb",
    description: "滑块视觉元素，跟随 aria-checked 状态移动。",
  },
  {
    name: "loading",
    value: ".c-switch__spinner + .c-sr-only",
    description: "加载指示器隐藏于辅助技术之外，真实加载文案由屏幕阅读器节点提供。",
  },
  {
    name: "form input",
    value: 'input[type="hidden"]',
    description: "仅在 checked 且 name 存在时渲染，不参与视觉布局；disabled/loading 时禁用提交。",
  },
  {
    name: "help",
    value: ".c-field__hint",
    description: "辅助说明，存在时由 aria-describedby 与根按钮关联。",
  },
];

const styleRows: DocRow[] = [
  {
    name: "theme style",
    value: "color / border / focus / dark",
    description: "主题层只控制轨道、滑块、状态文字、label、错误和 focus-visible 颜色；暗色通过 :root[data-theme] 与 ConfigProvider dark 覆盖。",
  },
  {
    name: "structure style",
    value: "size / spacing / overflow / touch",
    description: "结构层固定根按钮 44px 触控目标、track/thumb 比例、长 label 换行、状态文字省略和窄屏无页面级横向 overflow。",
  },
  {
    name: "state style",
    value: "checked / disabled / loading / error",
    description: "状态层只切换 class 和 ARIA 派生视觉，不依赖业务文案长度；loading 隐藏 thumb 并禁用交互。",
  },
  {
    name: "content style",
    value: "label / helper / state text",
    description: "可见 label 与 helper 在字段容器内换行；checkedChildren/unCheckedChildren 只适合短词，长内容在轨道内截断。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "trackOff",
    value: "#dadad6",
    description: "关闭状态轨道背景。",
  },
  {
    name: "trackOn",
    value: "#111110",
    description: "开启状态轨道背景，沿用中性强对比。",
  },
  {
    name: "trackBorder",
    value: "#c8c8c3",
    description: "关闭状态和普通边界。",
  },
  {
    name: "thumb",
    value: "#ffffff",
    description: "滑块填充色。",
  },
  {
    name: "disabled",
    value: "#ededeb / #c8c8c3",
    description: "禁用关闭与禁用开启状态背景。",
  },
  {
    name: "loading",
    value: "#696967 / #ffffff",
    description: "加载指示器在关闭和开启轨道上的颜色。",
  },
  {
    name: "stateText",
    value: "#555552 / #ffffff",
    description: "关闭和开启状态文字颜色，保持浅色与深色轨道可读。",
  },
  {
    name: "error",
    value: "#9f3a38 / #5c2220",
    description: "错误边界与错误开启背景。",
  },
  {
    name: "focus",
    value: "#555552",
    description: "focus-visible 轮廓颜色。",
  },
];

const faqItems = [
  {
    question: "Switch 和 Checkbox 怎么选？",
    answer: "Switch 用于立即生效的二元设置；Checkbox 更适合表单提交前收集选择。",
  },
  {
    question: "为什么根元素是 button？",
    answer: "button 能直接获得焦点、禁用和键盘基础语义，再叠加 role=switch 与 aria-checked 即可表达开关状态。",
  },
  {
    question: "移动端能用吗？",
    answer: "能用。sm/md/lg 都保留至少 44px 根触控目标，360/390/430px 下长标签会换行，不产生页面级横向 overflow。",
  },
  {
    question: "loading 和 disabled 有什么区别？",
    answer: "loading 表示等待异步结果，会显示忙碌状态并临时禁用切换；disabled 表示当前业务不可操作，不暗示正在处理。",
  },
  {
    question: "能参与原生表单提交吗？",
    answer: "可以。传入 name 后，checked 时提交隐藏字段；value 默认 on；未选中、disabled 或 loading 时不提交该字段。",
  },
];

const expertRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "Switch 只用于立即生效的开关，不把表单多选场景并入 Checkbox 文档。" },
  { name: "UI 专家", value: "通过", description: "checked、unchecked、loading、disabled、error、sizes、状态文字、长 label、浅色与暗色可读性都有独立视觉与移动收敛。" },
  { name: "研发专家", value: "通过", description: "checked/defaultChecked/onChange/onCheckedChange、preventDefault、name/value/form、原生 disabled 和 loading 禁用路径已覆盖。" },
  { name: "测试专家", value: "通过", description: "验收覆盖 #switch smoke、desktop、360/390/430 移动触控、无横向溢出、教程壳层、样例一行、scan 和 build。" },
  { name: "白帽专家", value: "通过", description: "checkedChildren/unCheckedChildren 使用 React 转义，不使用 dangerouslySetInnerHTML；ARIA switch 和禁用依赖边界已覆盖。" },
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

export function SwitchDoc({ showAnchors = false }: SwitchDocProps) {
  return (
    <TutorialScaffold
      component="Switch"
      kind="data-entry"
      oneLineExample={`<Switch name="releaseSync" value="enabled" defaultChecked label="发布同步" />`}
    >
      <section className="button-doc" aria-labelledby="switch-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="Switch 文档目录">
              {switchDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc</p>
              <h2 id="switch-doc-title">{switchDocMeta.title}</h2>
              <p>
                用于切换一个立即生效的二元状态。当前 Switch 支持受控与非受控模式、三档尺寸、FormData
                隐藏字段提交，使用 <code>role="switch"</code> 和 <code>aria-checked</code> 暴露状态，并保留原生 button
                的键盘、加载与禁用语义。
              </p>
            </header>

            <section className="button-doc-section" id="switch-when" aria-labelledby="switch-when-title">
              <h3 id="switch-when-title">何时使用</h3>
              <ul className="button-doc-list">
                <li>用于开启/关闭某个会立即生效的配置，例如自动保存、预览、同步。</li>
                <li>状态文案应描述结果，而不是写成模糊的确认动作。</li>
                <li>需要提交表单后才生效的多项选择时，优先使用 Checkbox。</li>
              </ul>
            </section>

            <section className="button-doc-section" id="switch-demos" aria-labelledby="switch-demos-title">
              <div className="button-doc-section__heading">
                <h3 id="switch-demos-title">代码演示</h3>
                <p>示例覆盖受控、非受控、键盘、ARIA、loading、禁用、尺寸、表单提交、错误和无可见标签。</p>
              </div>
              <div className="button-doc-demo-grid">
                {demos.map((demo) => (
                  <DemoCard key={demo.title} {...demo} />
                ))}
              </div>
            </section>

            <section className="button-doc-section" id="switch-api" aria-labelledby="switch-api-title">
              <h3 id="switch-api-title">API</h3>
              <DataTable rows={apiRows} />
            </section>

            <section className="button-doc-section" id="switch-a11y" aria-labelledby="switch-a11y-title">
              <h3 id="switch-a11y-title">可访问性</h3>
              <DataTable rows={a11yRows} />
            </section>

            <section className="button-doc-section" id="switch-semantic" aria-labelledby="switch-semantic-title">
              <h3 id="switch-semantic-title">Semantic DOM</h3>
              <DataTable rows={semanticRows} />
            </section>

            <section className="button-doc-section" id="switch-style" aria-labelledby="switch-style-title">
              <h3 id="switch-style-title">样式边界</h3>
              <DataTable rows={styleRows} />
            </section>

            <section className="button-doc-section" id="switch-token" aria-labelledby="switch-token-title">
              <h3 id="switch-token-title">Design Token</h3>
              <DataTable rows={tokenRows} />
            </section>

            <section className="button-doc-section" id="switch-faq" aria-labelledby="switch-faq-title">
              <h3 id="switch-faq-title">FAQ</h3>
              <div className="button-doc-faq">
                {faqItems.map((item) => (
                  <article className="button-doc-faq__item" key={item.question}>
                    <h4>{item.question}</h4>
                    <p>{item.answer}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="button-doc-section" id="switch-experts" aria-labelledby="switch-experts-title">
              <h3 id="switch-experts-title">五专家验收</h3>
              <DataTable rows={expertRows} />
            </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
