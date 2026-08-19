import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MessageSquareText, Mic, Send, Sparkles, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ella")({
  head: () => ({
    meta: [
      { title: "Ella App — Voice + text companion" },
      {
        name: "description",
        content: "Ella is a mobile-friendly assistant app with messaging, quick replies, and voice-first support.",
      },
    ],
  }),
  component: EllaAppPage,
});

type Message = {
  id: number;
  role: "ella" | "me";
  text: string;
};

const starterMessages: Message[] = [
  { id: 1, role: "ella", text: "Welcome back. I'm Ella, your assistant. Ready when you are." },
  { id: 2, role: "me", text: "Can you help me with a quick update?" },
  { id: 3, role: "ella", text: "Yes. I can draft texts, summarize notes, help plan your day, and answer questions in a calm voice." },
];

const quickPrompts = [
  "Send a quick check-in text",
  "Set a reminder for today",
  "What should I do next?",
  "Draft a thoughtful reply",
];

function EllaAppPage() {
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [draft, setDraft] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const statusText = useMemo(() => {
    return messages.at(-1)?.role === "ella" ? "Ella is listening" : "Ready to send";
  }, [messages]);

  const addMessage = (text: string, role: Message["role"]) => {
    setMessages((current) => [...current, { id: Date.now() + Math.random(), role, text }]);
  };

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    addMessage(trimmed, "me");
    const reply = makeEllaReply(trimmed);
    setTimeout(() => addMessage(reply, "ella"), 250);
    setDraft("");
  };

  const handleQuickPrompt = (value: string) => {
    setDraft(value);
  };

  const handleSendText = () => {
    const message = draft.trim() || "Hey, this is Ella. I'm checking in.";
    const target = phoneNumber.trim() || "+15551234567";
    const text = encodeURIComponent(message);
    const smsHref = `sms:${target}?body=${text}`;
    try {
      window.location.href = smsHref;
    } catch {
      window.open(`sms:${target}?body=${text}`, "_self");
    }
    addMessage(`Text ready to send to ${target}`, "ella");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(228,177,161,0.35),_transparent_28%),linear-gradient(180deg,#fff8f5_0%,#fffdfd_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ella app</p>
              <h1 className="font-display text-3xl md:text-4xl">Personal assistant</h1>
            </div>
          </div>
          <div className="rounded-full border border-border bg-white/70 px-3 py-1.5 text-sm shadow-sm">
            {statusText}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] border border-border/70 bg-white/80 p-4 shadow-[0_25px_68px_rgba(154,94,101,0.12)] backdrop-blur-md md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquareText className="h-4 w-4" />
                Ella chat
              </div>
              <Button variant="outline" size="sm" type="button">
                <Mic className="mr-2 h-4 w-4" /> Voice
              </Button>
            </div>

            <div className="flex h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl bg-[#fffaf8] p-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    message.role === "ella"
                      ? "bg-[#f7e8e8] text-foreground"
                      : "ml-auto bg-primary text-primary-foreground"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="rounded-full border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  placeholder="Type a message for Ella..."
                  className="min-h-[88px] flex-1 rounded-2xl border border-border bg-background px-3 py-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
                />
                <Button type="button" onClick={handleSend} className="self-end rounded-2xl px-4">
                  <Send className="mr-2 h-4 w-4" /> Send
                </Button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5 shadow-[0_20px_48px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                <Phone className="h-4 w-4" />
                Text from Ella
              </div>

              <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Phone number
              </label>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+1 555 123 4567"
                className="mb-4 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />

              <Button type="button" variant="secondary" className="w-full" onClick={handleSendText}>
                Send text on phone
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Opens your phone's default SMS app with the message prefilled.
              </p>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-white/80 p-5 shadow-[0_20px_48px_rgba(0,0,0,0.04)]">
              <p className="mb-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">Ella can help with</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Quick check-ins and text replies</li>
                <li>• Daily planning and reminders</li>
                <li>• Calm voice-style answers</li>
                <li>• Messaging from your phone browser</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function makeEllaReply(input: string) {
  const text = input.trim();
  if (!text) return "I’m here.";

  const normalized = text.toLowerCase();
  if (normalized.includes("reminder") || normalized.includes("remember")) {
    return "I can help with that. Set a reminder in your notes or phone, and I’ll keep it simple and calm.";
  }

  if (normalized.includes("text") || normalized.includes("sms") || normalized.includes("message")) {
    return "I can draft a text and open your phone’s SMS app so you can send it quickly.";
  }

  if (normalized.includes("schedule") || normalized.includes("plan") || normalized.includes("today")) {
    return "Start with the most important task, then schedule one follow-up item after it. Keep the rest light.";
  }

  return `I understand. I can help you sort this out clearly and keep the next step simple.`;
}
