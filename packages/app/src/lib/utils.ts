import { init } from "@paralleldrive/cuid2";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const createAppointmentReference = init({
  length: 6,
});

export const extractTextFromHTML = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
