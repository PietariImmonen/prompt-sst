import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkspaceSchema } from "@prompt-saver/core/models/Workspace";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";

const WorkspaceCreateSchema = z.object({
  name: z.string().min(3).trim(),
  type: WorkspaceSchema.shape.type,
});

export function WorkspaceCreateForm() {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const auth = useAuth();

  const { t } = useLocale();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof WorkspaceCreateSchema>>({
    defaultValues: {
      name: "",
      type: "organization",
    },
    resolver: zodResolver(WorkspaceCreateSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const onSubmit = async (data: z.infer<typeof WorkspaceCreateSchema>) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        import.meta.env.VITE_API_URL + "/workspace",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${auth.current.token}`,
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        console.log(error);
      }

      const body = await response.json();

      await auth.refresh();
      const workspace = body.result;
      await navigate(`/${workspace.slug}/dashboard`);
    } catch (error) {
      toast.error(t("workspace:toast.unknownError"));
      console.log(error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <div className="grid gap-4">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <FormField
                {...form}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="sr-only">
                      {t("workspace:label.name")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-10 rounded-md"
                        placeholder={t("workspace:label.name")}
                        autoCapitalize="none"
                        autoComplete="name"
                        autoCorrect="off"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col gap-1"
                      >
                        <FormItem className="flex items-center space-y-0 space-x-3">
                          <FormLabel className="flex w-full items-center justify-between gap-4 rounded-lg border border-border p-3 font-normal shadow-xs hover:cursor-pointer">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {t("workspace:label.organization")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t("workspace:description.organization")}
                              </p>
                            </div>
                            <FormControl>
                              <RadioGroupItem value="organization" />
                            </FormControl>
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-y-0 space-x-3">
                          <FormLabel className="flex w-full items-center justify-between gap-4 rounded-lg border border-border p-3 font-normal shadow-xs hover:cursor-pointer">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {t("workspace:label.individual")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t("workspace:description.individual")}
                              </p>
                            </div>
                            <FormControl>
                              <RadioGroupItem value="individual" />
                            </FormControl>
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button size="lg" disabled={isLoading || !form.formState.isValid}>
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                {t("workspace:action.create")}
              </Button>
              <p className="text-center text-[0.8rem] text-muted-foreground">
                {t("workspace:description.type")}
              </p>
            </div>
          </div>
        </form>
      </div>
    </Form>
  );
}
