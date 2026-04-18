"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const set = (key: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <Card className="p-8 md:p-10 border border-outline-variant/15">
      <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
        Send a message
      </span>
      <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-on-background mt-2">
        Tell us what you're planning
      </h2>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-8 flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input
              placeholder="Your full name"
              value={values.name}
              onChange={set("name")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={set("email")}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Phone</Label>
          <Input
            type="tel"
            placeholder="+254 ..."
            value={values.phone}
            onChange={set("phone")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Message</Label>
          <Textarea
            placeholder="Where are you dreaming of going, and when?"
            value={values.message}
            onChange={set("message")}
            rows={6}
          />
        </div>
        <Button size="lg" className="mt-2 w-full md:w-auto md:self-end">
          <Send className="h-4 w-4" />
          Send message
        </Button>
      </form>
    </Card>
  );
}
