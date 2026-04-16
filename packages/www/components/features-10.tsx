import { ReactNode } from "react";
import { Sparkles, Share2, Zap, LucideIcon } from "lucide-react";

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
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold md:text-4xl">Everything handled for you</h2>
          <p className="mt-4 text-zinc-400">No editing software. No scheduling tools. No juggling platforms. Just results.</p>
        </div>
        <div className="mx-auto grid gap-4 lg:grid-cols-3">
          <FeatureCard>
            <CardHeader className="pb-3">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 top-0 h-32 rounded-lg [background:radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(59,130,246,0.1)_0%,transparent_70%)]"
              />
              <CardHeading
                icon={Sparkles}
                title="AI Video Creation"
                description="Your idea becomes a video in minutes."
              />
              <CardDescription className="text-muted-foreground mb-3 px-6 text-sm">
                Type a prompt or paste a script. Clyo's AI writes, designs, voices, and assembles a polished short-form video — no timeline, no keyframes, no experience needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 size-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-sm text-zinc-300">Script written automatically</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 size-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-sm text-zinc-300">Voiceover generated with natural AI voice</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 size-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-sm text-zinc-300">Visuals, captions & music added</span>
                </div>
              </div>
            </CardContent>
          </FeatureCard>

          <FeatureCard>
            <CardHeader className="pb-3">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 top-0 h-32 rounded-lg [background:radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(139,92,246,0.1)_0%,transparent_70%)]"
              />
              <CardHeading
                icon={Share2}
                title="Auto-Post Everywhere"
                description="One click. Every platform. Done."
              />
              <CardDescription className="text-muted-foreground mb-3 px-6 text-sm">
                Connect your accounts once and Clyo publishes your videos across TikTok, Instagram Reels, YouTube Shorts, X, LinkedIn, and more — automatically, at the best time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-3">
                {["TikTok", "Instagram Reels", "YouTube Shorts", "LinkedIn", "X / Twitter"].map((platform) => (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{platform}</span>
                    <span className="text-xs rounded-full bg-emerald-400/10 text-emerald-400 px-2 py-0.5">Connected</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </FeatureCard>

          <FeatureCard>
            <CardHeader className="pb-3">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 top-0 h-32 rounded-lg [background:radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(234,179,8,0.08)_0%,transparent_70%)]"
              />
              <CardHeading
                icon={Zap}
                title="Built for Volume"
                description="Stay consistent without burning out."
              />
              <CardDescription className="text-muted-foreground mb-3 px-6 text-sm">
                The creators who win post daily. Clyo makes that effortless — batch-create a week of content in an afternoon, schedule it all, and let the algorithm do the rest.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 size-2 rounded-full bg-yellow-400 shrink-0" />
                  <span className="text-sm text-zinc-300">Batch create 7 videos at once</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 size-2 rounded-full bg-yellow-400 shrink-0" />
                  <span className="text-sm text-zinc-300">Smart scheduling for peak engagement</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 size-2 rounded-full bg-yellow-400 shrink-0" />
                  <span className="text-sm text-zinc-300">Analytics across all platforms in one place</span>
                </div>
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
