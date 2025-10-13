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

  // Check localStorage on mount
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

    // Check localStorage first
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
      // Collect browser metadata and UTM parameters
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
        setMessage(data.result?.message || "Successfully joined the waitlist!");
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
            <div className="mx-auto max-w-5xl px-6 pb-12">
              <div className="flex flex-col items-center justify-center sm:mx-auto lg:mr-auto lg:mt-0">
                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="mt-8 max-w-2xl text-balance text-center text-5xl font-medium md:text-6xl lg:mt-16"
                >
                  Master Your LLM Workflow with Clyo
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mt-8 max-w-2xl text-pretty text-center text-lg"
                >
                  Transcribe anywhere on your Mac, automatically save your
                  prompts, and manage all your LLM interactions from one central
                  place. Say goodbye to scattered prompts and hello to
                  effortless reusability.
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
                  className="mt-10 flex items-center gap-2"
                >
                  <form onSubmit={handleSubmit} className="mx-auto max-w-sm">
                    <div className="bg-background has-[input:focus]:ring-muted w-sm relative grid grid-cols-[1fr_auto] items-center rounded-[calc(var(--radius)+0.75rem)] border pr-3 shadow shadow-zinc-950/5 has-[input:focus]:ring-2">
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
                          disabled={
                            status === "loading" || status === "success"
                          }
                        >
                          <span className="hidden md:block">
                            {status === "loading"
                              ? "Joining..."
                              : status === "success"
                                ? "Joined!"
                                : "Join Waitlist"}
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
                </AnimatedGroup>
              </div>
            </div>
            {/* <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="mask-b-from-55% relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-5xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
                  <Image
                    className="bg-background relative rounded-2xl"
                    src="/CLYO_DEMO.png"
                    alt="app screen"
                    width="2700"
                    height="1440"
                  />
                </div>
              </div>
            </AnimatedGroup> */}
          </div>
        </section>
      </main>
    </>
  );
}
