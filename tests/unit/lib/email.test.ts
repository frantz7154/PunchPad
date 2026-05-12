import { describe, it, expect, vi } from "vitest";
import { sendEmail, type EmailTransport } from "@/lib/email";

describe("sendEmail", () => {
  it("calls resend send when transport=resend", async () => {
    const send = vi.fn().mockResolvedValue({ id: "fake" });
    const t: EmailTransport = { kind: "resend", send };
    await sendEmail(t, { to: "a@x.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@x.com", subject: "Hi" }),
    );
  });

  it("calls smtp send when transport=smtp", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "fake" });
    const t: EmailTransport = { kind: "smtp", send };
    await sendEmail(t, { to: "a@x.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(send).toHaveBeenCalled();
  });
});
