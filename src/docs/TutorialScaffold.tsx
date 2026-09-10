import { useMemo, type ReactNode } from "react";
import {
  Button,
  Card,
  Descriptions,
  Icon,
  Tabs,
  Tag,
  Toolbar,
  ToolbarGroup,
} from "../components/base";
import { DemoContainer } from "./DemoContainer";

export type TutorialKind = "display" | "feedback" | "data-entry" | "action";

export type TutorialScaffoldProps = {
  children: ReactNode;
  component: string;
  kind: TutorialKind;
  oneLineExample: string;
  overlay?: boolean;
};

const kindLabels: Record<TutorialKind, string> = {
  action: "快捷动作",
  "data-entry": "数据录入",
  display: "数据展示",
  feedback: "反馈",
};

function getBoundaryText(kind: TutorialKind, overlay: boolean) {
  if (overlay) {
    return "适合短时浮层、确认或辅助说明；必须提供关闭路径、焦点回收、Escape/外点策略和移动端层级检查。";
  }

  if (kind === "feedback") {
    return "适合表达加载、成功、失败、确认或系统通知；不承载复杂编辑，也不把业务异常藏在无状态文案里。";
  }

  if (kind === "data-entry") {
    return "适合组织可提交、可校验、可重置的输入任务；字段值、错误生成和业务规则应由调用方或业务状态管理。";
  }

  if (kind === "action") {
    return "适合承载页面级快捷动作、返回顶部、帮助入口或反馈入口；业务副作用、展开菜单和滚动行为由调用方实现。";
  }

  return "适合展示对象、集合、状态或媒体内容；当用户需要编辑、提交或复杂筛选时应组合数据录入和业务组件。";
}

function getMobileText(kind: TutorialKind, overlay: boolean) {
  if (overlay) {
    return "360/390/430px 下检查面板不贴边遮挡、触控目标不低于 44px、背景不可误操作，z-index 与滚动锁保持稳定。";
  }

  if (kind === "feedback") {
    return "360/390/430px 下检查状态文案换行、图标与操作不挤压、加载骨架不制造页面级横向滚动。";
  }

  if (kind === "data-entry") {
    return "360/390/430px 下检查 label、输入控件、错误、帮助文本和操作按钮纵向收敛，原生控件不撑破字段容器。";
  }

  if (kind === "action") {
    return "360/390/430px 下检查 fixed 层、safe-area、z-index、键盘 focus 和 44px 以上触控目标，避免遮挡核心内容。";
  }

  return "360/390/430px 下检查表格、列表、图片、二维码和长文本在组件内部滚动或换行，不造成页面级横向 overflow。";
}

function getSecurityText(overlay: boolean) {
  if (overlay) {
    return "浮层内容只渲染 ReactNode，不解析 HTML 字符串；关闭 reason、focus trap 和遮罩策略用于降低背景误触与焦点逃逸。";
  }

  return "教程样例以 React 文本渲染为边界，不使用 dangerouslySetInnerHTML；图片、二维码和用户文案只展示，不执行。";
}

function CopyOneLineButton({ text }: { text: string }) {
  return (
    <Button
      icon={<Icon decorative name="copy" />}
      onClick={() => {
        void navigator.clipboard?.writeText(text);
      }}
      size="sm"
      variant="ghost"
    >
      复制一行示例
    </Button>
  );
}

export function TutorialScaffold({
  children,
  component,
  kind,
  oneLineExample,
  overlay = false,
}: TutorialScaffoldProps) {
  const summaryItems = useMemo(
    () => [
      { key: "scene", label: "场景", value: kindLabels[kind] },
      { key: "preview", label: "真实预览", value: "保留当前页 DemoContainer / demo 预览" },
      { key: "copy", label: "可复制", value: "每页提供一行 TSX 示例" },
      { key: "mobile", label: "移动端", value: "360 / 390 / 430px smoke" },
    ],
    [kind],
  );
  const boundaryText = getBoundaryText(kind, overlay);
  const mobileText = getMobileText(kind, overlay);
  const securityText = getSecurityText(overlay);

  return (
    <div className="tutorial-scaffold" data-kind={kind} data-overlay={overlay ? "true" : "false"}>
      <Card
        actions={
          <Toolbar compact mobileBehavior="wrap" variant="plain" aria-label={`${component} 教程操作`}>
            <ToolbarGroup aria-label="教程标签">
              <Tag tone={kind === "feedback" ? "warning" : "info"}>{kindLabels[kind]}</Tag>
              {overlay ? <Tag tone="danger">Overlay</Tag> : null}
              <Tag tone="success">移动端已纳入</Tag>
            </ToolbarGroup>
            <ToolbarGroup aria-label="复制操作">
              <CopyOneLineButton text={oneLineExample} />
            </ToolbarGroup>
          </Toolbar>
        }
        className="tutorial-scaffold__card"
        description="统一用 Tessera 的 Card、Descriptions、Tag、Toolbar、Tabs 与 DemoContainer 组织展示/反馈教程，保留真实预览并明确使用边界。"
        title={`${component} 教程治理`}
      >
        <Tabs
          aria-label={`${component} 教程核验维度`}
          items={[
            {
              id: "overview",
              label: "总览",
              content: (
                <Descriptions
                  bordered
                  className="tutorial-scaffold__descriptions"
                  column={{ default: 4, md: 2, sm: 1 }}
                  items={summaryItems}
                  size="sm"
                />
              ),
            },
            {
              id: "boundary",
              label: "使用边界",
              content: <p className="tutorial-scaffold__panel-text">{boundaryText}</p>,
            },
            {
              id: "mobile",
              label: "移动端/浮层",
              content: <p className="tutorial-scaffold__panel-text">{mobileText}</p>,
            },
            {
              id: "security",
              label: "安全",
              content: <p className="tutorial-scaffold__panel-text">{securityText}</p>,
            },
          ]}
        />
        <DemoContainer
          background="sunken"
          code={oneLineExample}
          description="复制按钮和源码区都使用同一条最小示例，便于教程页快速落地到业务代码。"
          title={`${component} 一行示例`}
        >
          <code className="tutorial-scaffold__inline-code">{oneLineExample}</code>
        </DemoContainer>
      </Card>
      {children}
    </div>
  );
}
