"use client";

import { Button } from "@/components/ui/button";
import { Mail, SendHorizonal } from "lucide-react";
import { FormEvent, useState } from "react";

interface WaitlistFormProps {
  className?: string;
}

export function WaitlistForm({ className }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Check localStorage first
    const alreadySubmitted = localStorage.getItem("clyo_waitlist_submitted");
    if (alreadySubmitted === "true") {
      setStatus("error");
      setMessage("You've already joined the waitlist!");
      return;
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

      // Get API URL from environment
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
        // Mark as submitted in localStorage
        localStorage.setItem("clyo_waitlist_submitted", "true");
        localStorage.setItem("clyo_waitlist_email", email);
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
    <form onSubmit={handleSubmit} className={className}>
      <div className="bg-background has-[input:focus]:ring-muted relative grid grid-cols-[1fr_auto] items-center rounded-[calc(var(--radius)+0.75rem)] border pr-3 shadow shadow-zinc-950/5 has-[input:focus]:ring-2">
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
              {status === "loading" ? "Joining..." : status === "success" ? "Joined!" : "Join Waitlist"}
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
          className={`mt-3 text-center text-sm ${
            status === "success" ? "text-green-500" : "text-red-500"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
