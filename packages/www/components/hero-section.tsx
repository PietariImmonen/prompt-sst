"use client";

import React from "react";
import { Mail, SendHorizonal } from "lucide-react";

import { AnimatedGroup } from "@/components/ui/animated-group";
import { Button } from "@/components/ui/button";
import { TextEffect } from "@/components/ui/text-effect";
import { HeroHeader } from "./header";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export default function HeroSection() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const alreadySubmitted = localStorage.getItem("clyo_waitlist_submitted");
      const savedEmail = localStorage.getItem("clyo_waitlist_email");
      if (alreadySubmitted === "true") {
        setStatus("success");
        setMessage("You've already joined the waitlist!");
        if (savedEmail) {
          setEmail(savedEmail);
        }
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (typeof window !== "undefined") {
      const alreadySubmitted = localStorage.getItem("clyo_waitlist_submitted");
      if (alreadySubmitted === "true") {
        setStatus("error");
        setMessage("You've already joined the waitlist!");
        return;
      }
    }

    setStatus("loading");

    try {
      const urlParams = new URLSearchParams(window.location.search);

      const metadata = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer: document.referrer || undefined,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        utmSource: urlParams.get("utm_source") || undefined,
        utmMedium: urlParams.get("utm_medium") || undefined,
        utmCampaign: urlParams.get("utm_campaign") || undefined,
        utmTerm: urlParams.get("utm_term") || undefined,
        utmContent: urlParams.get("utm_content") || undefined,
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      const response = await fetch(`${apiUrl}/waitlist/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          source: "website",
          metadata,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.result?.message || "You're on the list! We'll be in touch.");
        setEmail("");
        if (typeof window !== "undefined") {
          localStorage.setItem("clyo_waitlist_submitted", "true");
          localStorage.setItem("clyo_waitlist_email", email);
        }
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error. Please check your connection and try again.");
      console.error("Waitlist submission error:", error);
    }
  };

  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden contain-strict lg:block"
        >
          <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24">
            <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"></div>
            <div className="mx-auto max-w-5xl px-6 pb-20">
              <div className="flex flex-col items-center justify-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup
                  variants={
                    {
                      container: {
                        visible: {
                          transition: {
                            staggerChildren: 0.05,
                            delayChildren: 0.2,
                          },
                        },
                      },
                      ...transitionVariants,
                    } as unknown as never
                  }
                  className="mb-6 mt-8 lg:mt-16"
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-400">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Early access — limited spots available
                  </span>
                </AnimatedGroup>

                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="max-w-3xl text-balance text-center text-5xl font-medium md:text-6xl lg:text-7xl"
                >
                  Create Videos. Post Everywhere.
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mt-6 max-w-xl text-pretty text-center text-lg text-zinc-400"
                >
                  Describe your idea. Clyo turns it into a polished video and automatically publishes it to TikTok, Instagram, YouTube, and more — in minutes, not hours.
                </TextEffect>

                <AnimatedGroup
                  variants={
                    {
                      container: {
                        visible: {
                          transition: {
                            staggerChildren: 0.05,
                            delayChildren: 0.75,
                          },
                        },
                      },
                      ...transitionVariants,
                    } as unknown as never
                  }
                  className="mt-10 w-full flex flex-col items-center gap-4"
                >
                  <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm">
                    <div className="bg-background has-[input:focus]:ring-muted w-full relative grid grid-cols-[1fr_auto] items-center rounded-[calc(var(--radius)+0.75rem)] border pr-3 shadow shadow-zinc-950/5 has-[input:focus]:ring-2">
                      <Mail className="text-caption pointer-events-none absolute inset-y-0 left-5 my-auto size-5" />
                      <input
                        placeholder="Your email address"
                        className="h-14 w-full bg-transparent pl-12 focus:outline-none"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={status === "loading" || status === "success"}
                      />
                      <div className="md:pr-1.5 lg:pr-0">
                        <Button
                          type="submit"
                          aria-label="submit"
                          className="rounded-(--radius)"
                          disabled={status === "loading" || status === "success"}
                        >
                          <span className="hidden md:block">
                            {status === "loading"
                              ? "Joining..."
                              : status === "success"
                                ? "You're in!"
                                : "Get Early Access"}
                          </span>
                          <SendHorizonal
                            className="relative mx-auto size-5 md:hidden"
                            strokeWidth={2}
                          />
                        </Button>
                      </div>
                    </div>
                    {message && (
                      <p
                        className={`mt-3 text-center text-sm ${status === "success" ? "text-green-500" : "text-red-500"}`}
                      >
                        {message}
                      </p>
                    )}
                  </form>
                  <p className="text-xs text-zinc-500">No credit card required. Free during beta.</p>
                </AnimatedGroup>

                {/* Social proof */}
                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 1.0,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-16 flex flex-wrap justify-center gap-8 text-center"
                >
                  {[
                    { stat: "10 min", label: "from idea to published video" },
                    { stat: "8+", label: "platforms supported" },
                    { stat: "0 editing", label: "skills required" },
                  ].map((item) => (
                    <div key={item.stat} className="flex flex-col items-center gap-1">
                      <span className="text-3xl font-semibold">{item.stat}</span>
                      <span className="text-sm text-zinc-500">{item.label}</span>
                    </div>
                  ))}
                </AnimatedGroup>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
