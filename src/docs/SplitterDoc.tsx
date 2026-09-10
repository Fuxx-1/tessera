import { useState, type ReactNode } from "react";
import { Button, Splitter, SplitterPanel, Tag } from "../components/base";
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

export type SplitterDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<Splitter aria-label="Workspace"><SplitterPanel defaultSize={32}>Navigation</SplitterPanel><SplitterPanel>Detail</SplitterPanel></Splitter>`;

export const splitterDocMeta = {
  title: "Splitter 分隔面板",
  category: "基础组件",
  anchors: [
    { id: "splitter-when", label: "何时使用" },
    { id: "splitter-demos", label: "代码演示" },
    { id: "splitter-api", label: "API" },
    { id: "splitter-semantic", label: "Semantic DOM" },
    { id: "splitter-keyboard", label: "键盘交互" },
    { id: "splitter-mobile", label: "移动端" },
    { id: "splitter-token", label: "Design Token" },
  ],
} satisfies ComponentDocMeta;

function PanelSample({ children, meta, title }: { children: ReactNode; meta: string; title: string }) {
  return (
    <div className="splitter-doc-panel">
      <span>{meta}</span>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

function ControlledDemo() {
  const [sizes, setSizes] = useState([34, 66]);

  return (
    <div className="splitter-doc-controlled">
      <Splitter aria-label="受控分隔面板示例" className="splitter-doc-demo-splitter" value={sizes} onValueChange={setSizes}>
        <SplitterPanel min={18} max={54} collapsible>
          <PanelSample meta="left" title="Navigation">
            使用按钮重置尺寸，拖拽条仍保持 separator 语义。
          </PanelSample>
        </SplitterPanel>
        <SplitterPanel min={34} max={100}>
          <PanelSample meta="right" title="Detail">
            当前左侧宽度约 {Math.round(sizes[0])}%，右侧约 {Math.round(sizes[1])}%。
          </PanelSample>
        </SplitterPanel>
      </Splitter>
      <div className="doc-demo-row">
        <Button size="sm" variant="ghost" onClick={() => setSizes([34, 66])}>
          Reset
        </Button>
        <Tag>{Math.round(sizes[0])}%</Tag>
      </div>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "水平面板",
    description: "默认左右排布，拖拽竖向 separator 调整相邻两个 panel 的百分比尺寸。",
    preview: (
      <Splitter aria-label="水平分隔面板示例" className="splitter-doc-demo-splitter">
        <SplitterPanel defaultSize={28} min={18} max={46} collapsible>
          <PanelSample meta="files" title="Explorer">
            面板保留 DOM，Enter 可在 collapsedSize 与 min 之间切换。
          </PanelSample>
        </SplitterPanel>
        <SplitterPanel min={26} max={100}>
          <PanelSample meta="editor" title="Canvas">
            ArrowLeft 和 ArrowRight 可以键盘调整相邻面板。
          </PanelSample>
        </SplitterPanel>
        <SplitterPanel defaultSize={22} min={16} max={34}>
          <PanelSample meta="inspect" title="Inspector">
            多面板时每个手柄只影响左右相邻区域。
          </PanelSample>
        </SplitterPanel>
      </Splitter>
    ),
    code: `<Splitter aria-label="工作区分隔面板"><SplitterPanel defaultSize={28} min={18} max={46} collapsible>Explorer</SplitterPanel><SplitterPanel min={26}>Canvas</SplitterPanel><SplitterPanel defaultSize={22} min={16} max={34}>Inspector</SplitterPanel></Splitter>`,
  },
  {
    title: "垂直面板",
    description: 'orientation="vertical" 改为上下排布，手柄的 aria-orientation 会变为 horizontal。',
    preview: (
      <Splitter
        aria-label="垂直分隔面板示例"
        className="splitter-doc-demo-splitter splitter-doc-demo-splitter--vertical"
        defaultValue={[58, 42]}
        orientation="vertical"
      >
        <SplitterPanel min={28}>
          <PanelSample meta="preview" title="Preview">
            上方面板使用高度百分比，向上或向下方向键进行调整。
          </PanelSample>
        </SplitterPanel>
        <SplitterPanel min={22} max={100} collapsible>
          <PanelSample meta="logs" title="Console">
            Home 与 End 可快速抵达当前相邻组合的约束边界。
          </PanelSample>
        </SplitterPanel>
      </Splitter>
    ),
    code: `<Splitter orientation="vertical" defaultValue={[58, 42]} aria-label="预览和日志分隔面板"><SplitterPanel min={28}>Preview</SplitterPanel><SplitterPanel min={22} collapsible>Console</SplitterPanel></Splitter>`,
  },
  {
    title: "受控尺寸",
    description: "value/defaultValue 与 onValueChange 采用百分比数组，适合和 URL、偏好设置或按钮联动。",
    preview: <ControlledDemo />,
    code: `const [sizes, setSizes] = useState([34, 66]); <Splitter value={sizes} onValueChange={setSizes}><SplitterPanel min={18} max={54} collapsible>Navigation</SplitterPanel><SplitterPanel min={34}>Detail</SplitterPanel></Splitter>`,
  },
  {
    title: "移动触控",
    description: "小屏下切换为堆叠 fallback 并隐藏手柄；粗指针宽屏设备仍扩大触控命中区。",
    preview: (
      <div className="splitter-doc-mobile-frame">
        <Splitter aria-label="移动端堆叠示例" defaultValue={[42, 58]}>
          <SplitterPanel min={20}>
            <PanelSample meta="summary" title="Task">
              小屏 smoke 应看到稳定堆叠布局且不暴露手柄。
            </PanelSample>
          </SplitterPanel>
          <SplitterPanel min={20}>
            <PanelSample meta="activity" title="Notes">
              触屏在宽屏容器中仍可通过 pointer 事件拖拽。
            </PanelSample>
          </SplitterPanel>
        </Splitter>
      </div>
    ),
    code: `<Splitter aria-label="移动端堆叠示例" defaultValue={[42, 58]}><SplitterPanel min={20}>Task</SplitterPanel><SplitterPanel min={20}>Notes</SplitterPanel></Splitter>`,
  },
];

const splitterApiRows: DocRow[] = [
  { name: "orientation", value: '"horizontal" | "vertical"', description: "面板排布方向。horizontal 为左右排布，vertical 为上下排布。默认 horizontal。" },
  { name: "value", value: "number[]", description: "受控尺寸数组，单位为百分比。数组长度应与 SplitterPanel 数量一致。" },
  { name: "defaultValue", value: "number[]", description: "非受控初始尺寸数组。未传时优先读取 Panel 的 size/defaultSize，否则均分 100%。" },
  { name: "onValueChange", value: "(value: number[]) => void", description: "拖拽、键盘或折叠切换后触发，返回归一化后的百分比尺寸。" },
  { name: "min / max", value: "number", description: "根级默认约束，Panel 未单独声明时使用。单位为百分比。" },
  { name: "keyboardStep", value: "number", description: "方向键每次调整的百分比步长。默认 5。" },
  { name: "disabled", value: "boolean", description: "禁用所有拖拽和键盘调整，separator 不进入 Tab 顺序。" },
];

const panelApiRows: DocRow[] = [
  { name: "defaultSize / size", value: "number", description: "Panel 建议尺寸，单位为百分比。受控尺寸仍由 Splitter.value 统一管理。" },
  { name: "min / max", value: "number", description: "Panel 级约束优先于根级约束。拖拽与键盘都会同时尊重相邻两个 Panel 的边界。" },
  { name: "collapsible", value: "boolean", description: "允许 Enter 或拖拽将当前 handle 前侧面板压到 collapsedSize。" },
  { name: "collapsedSize", value: "number", description: "折叠尺寸，默认 8%。折叠不会卸载内容，只改变 panel basis。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLDivElement>", description: "Panel 和 Splitter 根节点均透传 id、aria-label、data-*、className 与 style。" },
];

const semanticRows: DocRow[] = [
  { name: ".c-splitter", value: "div", description: "承载所有面板，使用 data-orientation 标记当前方向。" },
  { name: ".c-splitter__panel", value: "div", description: "内容面板，保持 DOM 常驻，尺寸通过 CSS 变量 --c-splitter-panel-size 控制。" },
  { name: ".c-splitter__handle", value: 'button[role="separator"]', description: "可聚焦、可拖拽、可键盘调整的分隔条，aria-controls 指向相邻两个 panel。" },
  { name: "aria-valuenow", value: "number", description: "表示 handle 前侧 panel 当前百分比尺寸，并同步 valuemin/valuemax。" },
];

const keyboardRows: DocRow[] = [
  { name: "ArrowLeft / ArrowRight", value: "horizontal", description: "左右排布时减少或增加前侧 panel 尺寸。" },
  { name: "ArrowUp / ArrowDown", value: "vertical", description: "上下排布时减少或增加前侧 panel 尺寸。" },
  { name: "Home / End", value: "boundary", description: "将前侧 panel 调整到当前相邻组合允许的最小或最大值。" },
  { name: "Enter", value: "collapse", description: "当前 handle 前侧 panel 若 collapsible，则在 collapsedSize 和 min 之间切换。" },
];

const mobileRows: DocRow[] = [
  { name: "Pointer Events", value: "mouse + touch", description: "拖拽统一使用 pointerdown/move/up，并通过 setPointerCapture 保持拖出容器后的连续调整。" },
  { name: "touch-action", value: "none", description: "手柄禁用浏览器默认触摸手势，确保拖拽尺寸时不会同时滚动页面。" },
  { name: "coarse pointer", value: "44px hit area", description: "粗指针设备扩大命中区，但视觉仍保持细线和中性把手。" },
  { name: "small viewport", value: "stack fallback", description: "窄屏下切换为单列堆叠并隐藏 separator 手柄，避免面板压缩和横向溢出。" },
];

const tokenRows: DocRow[] = [
  { name: "--c-splitter-handle-size", value: "10px", description: "手柄实际命中带宽度或高度。" },
  { name: "--c-splitter-panel-size", value: "computed %", description: "每个 panel 当前 basis，由组件运行时写入。" },
  { name: "border color", value: "#dededb", description: "沿用 Tessera 组件中性的细边框体系。" },
  { name: "focus outline", value: "2px #555552", description: "手柄聚焦态与其他交互组件保持一致。" },
  {
    name: "主题 style",
    value: "--ct-surface / --ct-border / --ct-focus-ring",
    description: "容器、panel、handle、track、hover 和 disabled 背景读取 --ct-* 语义 token；亮/暗主题下不使用彩色选中态。",
  },
  {
    name: "结构 style",
    value: "flex panels / draggable handle / panel basis",
    description: "水平/垂直方向、panel min/max、手柄命中带、touch-action 和移动端纵向降级都属于结构样式。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo splitter-doc-demo">
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

export function SplitterDoc({ showAnchors = false }: SplitterDocProps) {
  return (
    <TutorialScaffold component="Splitter" kind="display" oneLineExample={oneLineExample}>
    <section className="splitter-doc" aria-labelledby="splitter-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Splitter 文档目录">
            {splitterDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="splitter-doc-title">{splitterDocMeta.title}</h2>
            <p>
              用于把同一工作区拆成多个可调整尺寸的面板。当前实现覆盖水平/垂直方向、拖拽、键盘 resize、
              min/max 约束、可折叠面板、ARIA separator 和移动端堆叠 fallback。
              五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；白帽安全边界确认组件不解析 HTML、不执行远程代码，拖拽尺寸只作用于本地样式状态。
            </p>
          </header>

          <section className="button-doc-section" id="splitter-when" aria-labelledby="splitter-when-title">
            <h3 id="splitter-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要让用户在同一任务中调整导航、编辑区、预览区、日志区等相邻空间。</li>
              <li>面板之间存在明确的“分隔并调整”关系，且调整结果应保留为比例状态。</li>
              <li>只需要页面骨架、侧栏或响应式布局时，仍使用 Layout；Splitter 不承载页面语义区域。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="splitter-demos" aria-labelledby="splitter-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="splitter-demos-title">代码演示</h3>
              <p>示例覆盖水平/垂直、多面板、受控尺寸、折叠边界和移动端堆叠。</p>
            </div>
            <div className="button-doc-demo-grid splitter-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="splitter-api" aria-labelledby="splitter-api-title">
            <h3 id="splitter-api-title">API</h3>
            <DataTable rows={splitterApiRows} />
            <DataTable rows={panelApiRows} />
          </section>

          <section className="button-doc-section" id="splitter-semantic" aria-labelledby="splitter-semantic-title">
            <h3 id="splitter-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="splitter-keyboard" aria-labelledby="splitter-keyboard-title">
            <h3 id="splitter-keyboard-title">键盘交互 / a11y</h3>
            <DataTable rows={keyboardRows} />
          </section>

          <section className="button-doc-section" id="splitter-mobile" aria-labelledby="splitter-mobile-title">
            <h3 id="splitter-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="splitter-token" aria-labelledby="splitter-token-title">
            <h3 id="splitter-token-title">Design Token / 安全</h3>
            <DataTable rows={tokenRows} />
          </section>
        </div>
      </div>
    </section>
  
    </TutorialScaffold>
  );
}
