import { InputHTMLAttributes } from "react";
import { Control, FieldValues, Path, PathValue } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  type?: InputHTMLAttributes<T>["type"];
  placeholder?: string;
  description?: string;
  defaultValue?: PathValue<T, Path<T>>;
  className?: string;
  addOnText?: string;
  action?: React.ReactNode;
}

export function FormTextField<T extends FieldValues>(props: Props<T>) {
  const {
    name,
    control,
    label,
    required,
    placeholder,
    description,
    className,
    type,
    action,
    addOnText,
  } = props;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className="space-y-0.5">
            <FormLabel>
              {label} {required && "*"}
            </FormLabel>
            {description && (
              <FormDescription className="text-sm">
                {description}
              </FormDescription>
            )}
          </div>
          <div className="space-y-3">
            <FormControl>
              <div className="flex gap-3">
                {addOnText ? (
                  <div className="flex flex-1 items-center rounded-md shadow-2xs file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-secondary-foreground focus-within:ring-2 focus-within:ring-ring focus-within:outline-hidden disabled:cursor-not-allowed disabled:opacity-50">
                    <Input
                      type={type}
                      placeholder={placeholder}
                      className={cn(
                        className,
                        "rounded-r-none shadow-none focus-visible:ring-0 focus-visible:outline-hidden",
                      )}
                      {...field}
                    />
                    <p className="h-9 rounded-r-md border border-l-0 bg-secondary/10 px-4 py-2 text-sm text-secondary-foreground">
                      {addOnText}
                    </p>
                  </div>
                ) : (
                  <Input
                    type={type}
                    placeholder={placeholder}
                    className={className}
                    {...field}
                  />
                )}
                {action}
              </div>
            </FormControl>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
