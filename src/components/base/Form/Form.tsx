import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  type FieldsetHTMLAttributes,
  type FormEvent,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type FormLayout = "vertical" | "horizontal" | "inline";
export type FormSubmitValues = Record<string, FormDataEntryValue | FormDataEntryValue[]>;

export type FormSubmitInfo = {
  event: FormEvent<HTMLFormElement>;
  formData: FormData;
  values: FormSubmitValues;
};

export interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "dangerouslySetInnerHTML" | "onSubmit"> {
  dangerouslySetInnerHTML?: never;
  layout?: FormLayout;
  onSubmit?: (info: FormSubmitInfo) => void;
  preventDefault?: boolean;
}

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML"> {
  children: ReactNode;
  dangerouslySetInnerHTML?: never;
  error?: ReactNode;
  help?: ReactNode;
  id?: string;
  label?: ReactNode;
  required?: boolean;
}

export interface FieldsetProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "dangerouslySetInnerHTML"> {
  dangerouslySetInnerHTML?: never;
  description?: ReactNode;
  error?: ReactNode;
  legend?: ReactNode;
}

type FormContextValue = {
  layout: FormLayout;
};

type ControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  id?: string;
  required?: boolean;
};

const FormContext = createContext<FormContextValue>({ layout: "vertical" });

function formDataToValues(formData: FormData): FormSubmitValues {
  const values: FormSubmitValues = {};

  formData.forEach((value, key) => {
    const currentValue = values[key];
    if (currentValue === undefined) {
      values[key] = value;
      return;
    }

    values[key] = Array.isArray(currentValue) ? [...currentValue, value] : [currentValue, value];
  });

  return values;
}

function isControlElement(node: ReactNode): node is ReactElement<ControlProps> {
  return isValidElement<ControlProps>(node);
}

export function Form({
  children,
  className,
  layout = "vertical",
  onSubmit,
  preventDefault = true,
  ...props
}: FormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (preventDefault) {
      event.preventDefault();
    }

    const formData = new FormData(event.currentTarget);

    onSubmit?.({
      event,
      formData,
      values: formDataToValues(formData),
    });
  };

  return (
    <FormContext.Provider value={{ layout }}>
      <form className={cx("c-form", `c-form--${layout}`, className)} onSubmit={handleSubmit} {...props}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

export function Field({
  children,
  className,
  error,
  help,
  id,
  label,
  required = false,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const { layout } = useContext(FormContext);
  const fieldId = id ?? generatedId;
  const labelId = label ? `${fieldId}-label` : undefined;
  const helpId = help ? `${fieldId}-help` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const childArray = Children.toArray(children);
  const shouldInjectControlProps = childArray.length === 1 && isControlElement(childArray[0]);
  const childControlId = shouldInjectControlProps ? (childArray[0] as ReactElement<ControlProps>).props.id : undefined;
  const controlId = childControlId ?? fieldId;

  const control = shouldInjectControlProps
    ? cloneElement(childArray[0] as ReactElement<ControlProps>, {
        "aria-describedby": [(childArray[0] as ReactElement<ControlProps>).props["aria-describedby"], describedBy]
          .filter(Boolean)
          .join(" ") || undefined,
        "aria-invalid": (childArray[0] as ReactElement<ControlProps>).props["aria-invalid"] ?? (error ? true : undefined),
        id: controlId,
        required: (childArray[0] as ReactElement<ControlProps>).props.required ?? required,
      })
    : children;

  return (
    <div
      className={cx("c-form-field", `c-form-field--${layout}`, error && "c-form-field--error", className)}
      data-required={required || undefined}
      {...props}
    >
      {label ? (
        shouldInjectControlProps ? (
          <label className="c-form-field__label" htmlFor={controlId} id={labelId}>
            <span>{label}</span>
            {required ? (
              <span aria-hidden="true" className="c-form-field__required">
                *
              </span>
            ) : null}
          </label>
        ) : (
          <span className="c-form-field__label" id={labelId}>
            <span>{label}</span>
            {required ? (
              <span aria-hidden="true" className="c-form-field__required">
                *
              </span>
            ) : null}
          </span>
        )
      ) : null}
      <div className="c-form-field__body" aria-labelledby={!shouldInjectControlProps ? labelId : undefined}>
        {control}
        {help ? (
          <div className="c-form-field__help" id={helpId}>
            {help}
          </div>
        ) : null}
        {error ? (
          <div className="c-form-field__error" id={errorId}>
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Fieldset({ children, className, description, error, legend, ...props }: FieldsetProps) {
  const generatedId = useId();
  const descriptionId = description ? `${generatedId}-description` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      className={cx("c-fieldset", error && "c-fieldset--error", className)}
      {...props}
    >
      {legend ? <legend className="c-fieldset__legend">{legend}</legend> : null}
      {description ? (
        <p className="c-fieldset__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <div className="c-fieldset__content">{children}</div>
      {error ? (
        <p className="c-fieldset__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
