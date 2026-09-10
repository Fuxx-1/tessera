import {
  forwardRef,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cx } from "../../../utils/cx";
import { Icon } from "../Icon";
import { IconButton } from "../IconButton";
import "./style.css";

export type UploadFileStatus = "ready" | "uploading" | "done" | "rejected";

export type UploadRejectionReason = "accept" | "maxSize" | "maxCount";

export type UploadFileItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: UploadFileStatus;
  reason?: UploadRejectionReason;
  message?: string;
  progress?: number;
};

export type UploadChangeInfo = {
  files: UploadFileItem[];
  acceptedFiles: UploadFileItem[];
  rejectedFiles: UploadFileItem[];
  source: "input" | "drop" | "remove";
};

export interface UploadProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML" | "defaultValue" | "onChange" | "children"> {
  accept?: string;
  browseLabel?: ReactNode;
  children?: ReactNode;
  defaultFiles?: UploadFileItem[];
  disabled?: boolean;
  description?: ReactNode;
  emptyText?: ReactNode;
  files?: UploadFileItem[];
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "accept" | "disabled" | "multiple" | "onChange" | "type" | "value"
  >;
  label?: ReactNode;
  maxCount?: number;
  maxSize?: number;
  multiple?: boolean;
  name?: string;
  onChange?: (info: UploadChangeInfo) => void;
  onRemove?: (file: UploadFileItem) => void;
  rejectMessages?: Partial<Record<UploadRejectionReason, (file: File) => string>>;
  removeButtonText?: ReactNode;
  removeLabel?: (file: UploadFileItem) => string;
}

const defaultRejectMessages: Record<UploadRejectionReason, (file: File) => string> = {
  accept: (file) => `${file.name} is not an accepted file type.`,
  maxCount: (file) => `${file.name} exceeds the maximum file count.`,
  maxSize: (file) => `${file.name} is larger than the maximum file size.`,
};

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

function getExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true;
  const rules = accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);

  if (rules.length === 0) return true;

  const fileType = file.type.toLowerCase();
  const extension = getExtension(file.name);

  return rules.some((rule) => {
    if (rule.startsWith(".")) return extension === rule;
    if (rule.endsWith("/*")) return fileType.startsWith(rule.slice(0, -1));
    return fileType === rule;
  });
}

function makeUploadItem(
  file: File,
  index: number,
  options: {
    accept?: string;
    maxSize?: number;
    reason?: UploadRejectionReason;
    rejectMessages?: UploadProps["rejectMessages"];
  },
): UploadFileItem {
  const rejectMessages = options.rejectMessages ?? {};
  const tooLarge = typeof options.maxSize === "number" && options.maxSize >= 0 && file.size > options.maxSize;
  const rejectedForAccept = !matchesAccept(file, options.accept);
  const reason = rejectedForAccept ? "accept" : tooLarge ? "maxSize" : options.reason;
  const message = reason ? (rejectMessages[reason] ?? defaultRejectMessages[reason])(file) : undefined;

  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    status: reason ? "rejected" : "ready",
    reason,
    message,
  };
}

function normalizeProgress(progress: number | undefined) {
  if (typeof progress !== "number" || !Number.isFinite(progress)) return undefined;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function splitFiles(files: UploadFileItem[]) {
  return {
    acceptedFiles: files.filter((file) => file.status !== "rejected"),
    rejectedFiles: files.filter((file) => file.status === "rejected"),
  };
}

export const Upload = forwardRef<HTMLDivElement, UploadProps>(function Upload(
  {
    accept,
    browseLabel = "Choose files",
    children,
    className,
    defaultFiles = [],
    description,
    disabled = false,
    emptyText = "No files selected.",
    files: controlledFiles,
    inputProps,
    label = "Upload files",
    maxCount,
    maxSize,
    multiple = false,
    name,
    onChange,
    onRemove,
    rejectMessages,
    removeButtonText = "Remove",
    removeLabel = (file) => `Remove ${file.name}`,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = inputProps?.id ?? `${generatedId}-input`;
  const descriptionId = description ? `${generatedId}-description` : undefined;
  const statusId = `${generatedId}-status`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolledFiles, setUncontrolledFiles] = useState(defaultFiles);
  const [isDragging, setIsDragging] = useState(false);
  const isControlled = controlledFiles !== undefined;
  const currentFiles = controlledFiles ?? uncontrolledFiles;
  const { acceptedFiles, rejectedFiles } = useMemo(() => splitFiles(currentFiles), [currentFiles]);
  const describedBy = [inputProps?.["aria-describedby"], descriptionId, statusId].filter(Boolean).join(" ") || undefined;
  const resolvedMaxCount = useMemo(() => {
    if (typeof maxCount === "number" && Number.isFinite(maxCount)) {
      return Math.max(0, Math.floor(maxCount));
    }
    return multiple ? undefined : 1;
  }, [maxCount, multiple]);

  const emitChange = useCallback(
    (nextFiles: UploadFileItem[], source: UploadChangeInfo["source"]) => {
      if (!isControlled) {
        setUncontrolledFiles(nextFiles);
      }

      const nextSplit = splitFiles(nextFiles);
      onChange?.({
        files: nextFiles,
        acceptedFiles: nextSplit.acceptedFiles,
        rejectedFiles: nextSplit.rejectedFiles,
        source,
      });
    },
    [isControlled, onChange],
  );

  const addFiles = useCallback(
    (fileList: FileList | File[], source: UploadChangeInfo["source"]) => {
      if (disabled) return;
      const selectedFiles = Array.from(fileList);
      const baseFiles = multiple ? currentFiles : [];
      let acceptedCount = baseFiles.filter((file) => file.status !== "rejected").length;
      const nextItems = selectedFiles.map((file, index) => {
        const provisionalItem = makeUploadItem(file, baseFiles.length + index, { accept, maxSize, rejectMessages });

        if (provisionalItem.status === "rejected") {
          return provisionalItem;
        }

        if (resolvedMaxCount !== undefined && acceptedCount >= resolvedMaxCount) {
          return makeUploadItem(file, baseFiles.length + index, {
            accept,
            maxSize,
            reason: "maxCount",
            rejectMessages,
          });
        }

        acceptedCount += 1;
        return provisionalItem;
      });
      const nextFiles = [...baseFiles, ...nextItems];
      emitChange(nextFiles, source);
    },
    [accept, currentFiles, disabled, emitChange, maxSize, multiple, rejectMessages, resolvedMaxCount],
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) {
      addFiles(event.currentTarget.files, "input");
    }
    event.currentTarget.value = "";
  };

  const openFilePicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) {
      event.dataTransfer.dropEffect = "none";
      return;
    }
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    addFiles(event.dataTransfer.files, "drop");
  };

  const handleRemove = (file: UploadFileItem) => {
    if (disabled) return;
    const nextFiles = currentFiles.filter((item) => item.id !== file.id);
    onRemove?.(file);
    emitChange(nextFiles, "remove");
  };

  return (
    <div
      className={cx(
        "c-upload",
        disabled && "c-upload--disabled",
        isDragging && "c-upload--dragging",
        rejectedFiles.length > 0 && "c-upload--has-rejections",
        className,
      )}
      ref={ref}
      {...props}
    >
      <input
        {...inputProps}
        accept={accept}
        aria-describedby={describedBy}
        className="c-upload__input"
        disabled={disabled}
        id={inputId}
        multiple={multiple}
        name={name}
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />

      <div
        aria-controls={statusId}
        aria-disabled={disabled || undefined}
        aria-labelledby={`${inputId}-label`}
        className="c-upload__dropzone"
        onClick={openFilePicker}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <div className="c-upload__mark" aria-hidden="true">
          +
        </div>
        <div className="c-upload__copy">
          <span className="c-upload__label" id={`${inputId}-label`}>
            {label}
          </span>
          {description ? (
            <span className="c-upload__description" id={descriptionId}>
              {description}
            </span>
          ) : null}
        </div>
        <span className="c-upload__browse" aria-hidden="true">
          {browseLabel}
        </span>
        {children}
      </div>

      <div className="c-upload__status" id={statusId} role="status" aria-live="polite">
        {currentFiles.length === 0
          ? emptyText
          : `${acceptedFiles.length} accepted, ${rejectedFiles.length} rejected.`}
      </div>

      {currentFiles.length > 0 ? (
        <ul className="c-upload__list" aria-label="Selected files">
          {currentFiles.map((file) => {
            const progress = normalizeProgress(file.progress);
            const shouldShowProgress = file.status !== "rejected" && progress !== undefined;
            const statusText =
              file.status === "uploading"
                ? progress === undefined
                  ? "Uploading"
                  : `Uploading ${progress}%`
                : file.status === "done"
                  ? "Done"
                  : file.status === "rejected"
                    ? "Rejected"
                    : "Ready";

            return (
              <li
                className={cx("c-upload__item", file.status === "rejected" && "c-upload__item--rejected")}
                key={file.id}
              >
                <div className="c-upload__file-main">
                  <span className="c-upload__file-name">{file.name}</span>
                  <span className="c-upload__file-meta">
                    {formatBytes(file.size)}
                    {file.type ? ` / ${file.type}` : ""}
                    {` / ${statusText}`}
                  </span>
                  {shouldShowProgress ? (
                    <span
                      aria-label={`${file.name} progress`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={progress}
                      className="c-upload__progress"
                      role="progressbar"
                    >
                      <span className="c-upload__progress-bar" style={{ inlineSize: `${progress}%` }} />
                    </span>
                  ) : null}
                  {file.message ? <span className="c-upload__file-error">{file.message}</span> : null}
                </div>
                <IconButton
                  className="c-upload__remove"
                  disabled={disabled}
                  label={removeLabel(file)}
                  onClick={() => handleRemove(file)}
                  size="sm"
                  tooltip={removeLabel(file)}
                  tooltipPlacement="top"
                >
                  <Icon decorative name="trash" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
});
