import { ReactNode } from "react";
import { Calendar, LucideIcon, MapIcon } from "lucide-react";
import Image from "next/image";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Features() {
  return (
    <section className="bg-zinc-50 py-16 md:py-32 dark:bg-transparent">
      <div className="mx-auto max-w-2xl px-6 lg:max-w-5xl">
        <div className="mx-auto grid gap-4 lg:grid-cols-2">
          <FeatureCard>
            <CardHeader className="pb-3">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 top-0 h-32 rounded-lg [background:radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(59,130,246,0.1)_0%,transparent_70%)]"
              />
              <CardHeading
                icon={MapIcon}
                title="Transcribe Anywhere"
                description="Voice-to-text across Mac, iOS, and Android."
              />
              <CardDescription className="text-muted-foreground mb-3 px-6 text-xs">
                {" "}
                Use a simple keyboard shortcut on your Mac or mobile device to transcribe
                audio from any application. Whether you're taking notes, writing emails,
                or capturing ideas—transcribe seamlessly wherever you work.{" "}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="border-border overflow-hidden rounded-lg border">
                <img
                  src="/transcription-example.png"
                  alt="Universal transcription interface"
                  className="h-auto w-full"
                />
              </div>
            </CardContent>
          </FeatureCard>

          <FeatureCard>
            <CardHeader className="pb-3">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 top-0 h-32 rounded-lg [background:radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(59,130,246,0.1)_0%,transparent_70%)]"
              />
              <CardHeading
                icon={Calendar}
                title="Superior Accuracy"
                description="Better transcription than native solutions with AI enhancement."
              />
              <CardDescription className="text-muted-foreground mb-3 px-6 text-xs">
                Advanced AI models deliver more accurate transcriptions than built-in
                speech-to-text on Mac and mobile. Get clearer, more precise text with
                intelligent context understanding and real-time improvements.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="border-border overflow-hidden rounded-lg border">
                <img
                  src="/prompt-improved.png"
                  alt="AI-powered transcription accuracy interface"
                  className="h-auto w-full"
                />
              </div>
            </CardContent>
          </FeatureCard>

          <FeatureCard>
            <CardHeader className="pb-3">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 top-0 h-32 rounded-lg [background:radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(59,130,246,0.1)_0%,transparent_70%)]"
              />
              <CardHeading
                icon={Calendar}
                title="Custom Vocabulary"
                description="Train the model with your own words and terminology."
              />
              <CardDescription className="text-muted-foreground mb-3 px-6 text-xs">
                {" "}
                Add custom words, technical terms, names, and industry-specific jargon
                to your personal model. Clyo learns your vocabulary and ensures
                accurate transcription of specialized terminology every time.{" "}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="border-border overflow-hidden rounded-lg border">
                <img
                  src="/prompt-palette.png"
                  alt="Custom vocabulary management interface"
                  className="h-auto w-full"
                />
              </div>
            </CardContent>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  children: ReactNode;
  className?: string;
}

const FeatureCard = ({ children, className }: FeatureCardProps) => (
  <Card
    className={cn("group relative rounded-none shadow-zinc-950/5", className)}
  >
    <CardDecorator />
    {children}
  </Card>
);

const CardDecorator = () => (
  <>
    <span className="border-primary absolute -left-px -top-px block size-2 border-l-2 border-t-2"></span>
    <span className="border-primary absolute -right-px -top-px block size-2 border-r-2 border-t-2"></span>
    <span className="border-primary absolute -bottom-px -left-px block size-2 border-b-2 border-l-2"></span>
    <span className="border-primary absolute -bottom-px -right-px block size-2 border-b-2 border-r-2"></span>
  </>
);

interface CardHeadingProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const CardHeading = ({ icon: Icon, title, description }: CardHeadingProps) => (
  <div className="p-6">
    <span className="text-muted-foreground flex items-center gap-2">
      <Icon className="size-4" />
      {title}
    </span>
    <p className="mt-2 text-lg font-semibold">{description}</p>
  </div>
);

interface DualModeImageProps {
  darkSrc: string;
  lightSrc: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

const DualModeImage = ({
  darkSrc,
  lightSrc,
  alt,
  width,
  height,
  className,
}: DualModeImageProps) => (
  <>
    <Image
      src={darkSrc}
      className={cn("hidden dark:block", className)}
      alt={`${alt} dark`}
      width={width}
      height={height}
    />
    <Image
      src={lightSrc}
      className={cn("shadow dark:hidden", className)}
      alt={`${alt} light`}
      width={width}
      height={height}
    />
  </>
);

interface CircleConfig {
  pattern: "none" | "border" | "primary" | "blue";
}

interface CircularUIProps {
  label: string;
  circles: CircleConfig[];
  className?: string;
}

const CircularUI = ({ label, circles, className }: CircularUIProps) => (
  <div className={className}>
    <div className="bg-linear-to-b from-border size-fit rounded-2xl to-transparent p-px">
      <div className="bg-linear-to-b from-background to-muted/25 relative flex aspect-square w-fit items-center -space-x-4 rounded-[15px] p-4">
        {circles.map((circle, i) => (
          <div
            key={i}
            className={cn("size-7 rounded-full border sm:size-8", {
              "border-primary": circle.pattern === "none",
              "border-primary bg-[repeating-linear-gradient(-45deg,var(--color-border),var(--color-border)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "border",
              "border-primary bg-background bg-[repeating-linear-gradient(-45deg,var(--color-primary),var(--color-primary)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "primary",
              "bg-background z-1 border-blue-500 bg-[repeating-linear-gradient(-45deg,var(--color-blue-500),var(--color-blue-500)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "blue",
            })}
          ></div>
        ))}
      </div>
    </div>
    <span className="text-muted-foreground mt-1.5 block text-center text-sm">
      {label}
    </span>
  </div>
);
