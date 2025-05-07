import { Editor } from "@tiptap/react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/hooks/use-locale";

interface FormatTypeProps {
  editor: Editor;
}

export function FormatType({ editor }: FormatTypeProps) {
  const { t } = useLocale();

  const value = () => {
    if (editor.isActive("paragraph")) return "paragraph";
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
  };

  // const onChange = (value: string) => {
  //   // switch (value) {
  //   //   case "paragraph":
  //   //     editor.chain().focus().setParagraph().run();
  //   //     break;
  //   //   case "h1":
  //   //     editor.chain().focus().toggleHeading({ level: 1 }).run();
  //   //     break;
  //   //   case "h2":
  //   //     editor.chain().focus().toggleHeading({ level: 2 }).run();
  //   //     break;
  //   //   case "h3":
  //   //     editor.chain().focus().toggleHeading({ level: 3 }).run();
  //   //     break;
  //   // }
  // };

  return (
    <Select defaultValue={value()} value={value()}>
      <SelectTrigger className="hidden h-8 w-[120px] sm:flex">
        <SelectValue placeholder="Select format" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="paragraph">
            {t("common:label.paragraph")}
          </SelectItem>
          <SelectItem value="h1">{t("common:label.h1")}</SelectItem>
          <SelectItem value="h2">{t("common:label.h2")}</SelectItem>
          <SelectItem value="h3">{t("common:label.h3")}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
