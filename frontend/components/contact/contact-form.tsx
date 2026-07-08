"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitInquiry } from "@/lib/api/inquiries";

const INITIAL = {
  fullName: "",
  contact: "",
  email: "",
  message: "",
};

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [values, setValues] = useState(INITIAL);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const set = (key: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setErrorMessage(null);

    try {
      await submitInquiry(values);
      setStatus("success");
      setValues(INITIAL);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    }
  }

  return (
    <Card className="p-8 md:p-10 border border-outline-variant/15">
      <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
        Send a message
      </span>
      <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-on-background mt-2">
        Tell us what you&apos;re planning
      </h2>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Name</Label>
            <Input
              id="fullName"
              placeholder="Your full name"
              value={values.fullName}
              onChange={set("fullName")}
              autoComplete="name"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={set("email")}
              autoComplete="email"
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact">Phone / WhatsApp</Label>
          <Input
            id="contact"
            type="tel"
            placeholder="+254 ..."
            value={values.contact}
            onChange={set("contact")}
            autoComplete="tel"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Where are you dreaming of going, and when?"
            value={values.message}
            onChange={set("message")}
            rows={6}
            required
          />
        </div>

        {status === "success" && (
          <div className="flex items-start gap-2 text-sm text-primary" role="status">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Thanks — we&apos;ve got your message and will be in touch shortly.</span>
          </div>
        )}

        {status === "error" && errorMessage && (
          <div className="flex items-start gap-2 text-sm text-red-500" role="alert">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={status === "submitting"}
          className="mt-2 w-full md:w-auto md:self-end"
        >
          <Send className="h-4 w-4" />
          {status === "submitting" ? "Sending..." : "Send message"}
        </Button>
      </form>
    </Card>
  );
}
