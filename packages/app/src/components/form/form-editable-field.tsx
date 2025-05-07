import * as React from "react";
import { Control, FieldValues, Path } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

export interface EditableProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
  readOnly?: boolean;
  displayValue?: string;
}

export function FormEditableField<T extends FieldValues>(
  props: EditableProps<T>,
) {
  const {
    control,
    name,
    placeholder,
    className,
    onBlur,
    readOnly,
    displayValue,
  } = props;
  const internalRef = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    const element = internalRef.current;
    if (element) {
      const value =
        readOnly && displayValue ? displayValue : control._getWatch(name);
      element.textContent = value || "";
    }
  }, [control, name, readOnly, displayValue]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        if (!readOnly && field.value !== internalRef.current?.textContent) {
          if (internalRef.current) {
            internalRef.current.textContent = field.value || "";
          }
        }

        return (
          <FormItem className={className}>
            <FormControl>
              <p
                tabIndex={readOnly ? -1 : 0}
                ref={internalRef}
                className={cn(
                  "h-full min-h-[24px] whitespace-pre-wrap focus-visible:outline-hidden",
                  !readOnly && "cursor-text",
                )}
                contentEditable={!readOnly}
                onInput={(e) => {
                  if (readOnly) return;
                  const content = e.currentTarget.textContent || "";
                  field.onChange(content);

                  if (!content) {
                    e.currentTarget.textContent = "";
                  }
                }}
                onFocus={(e) => {
                  const range = document.createRange();
                  range.selectNodeContents(e.currentTarget);
                  range.collapse(false);
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }}
                onBlur={onBlur}
                suppressContentEditableWarning
                data-placeholder={placeholder}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
