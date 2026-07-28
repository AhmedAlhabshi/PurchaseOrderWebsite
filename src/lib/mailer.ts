import nodemailer from "nodemailer";

export type SendResult = {
  mode: "sent" | "preview";
  message: string;
  messageId?: string;
};

export type SendPOEmailArgs = {
  to: string;
  cc: string[];
  subject: string;
  poNumber: string;
  supplierName: string;
  attention?: string | null;
  preparedBy: string;
  pdf: Buffer;
};

function isConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
  );
}

function buildBody(args: SendPOEmailArgs): { text: string; html: string } {
  const greeting = args.attention ? `Dear ${args.attention},` : "Dear Sir/Madam,";
  const text = `${greeting}

Please find attached our Purchase Order ${args.poNumber}.
Kindly confirm receipt and share your order confirmation at your convenience.

Best regards,
${args.preparedBy}
Diamond Tools & Equipment Est.`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;line-height:1.6">
  <p>${greeting}</p>
  <p>Please find attached our Purchase Order <strong>${args.poNumber}</strong>.<br/>
  Kindly confirm receipt and share your order confirmation at your convenience.</p>
  <p>Best regards,<br/>
  ${args.preparedBy}<br/>
  <span style="color:#1d4ed8;font-weight:bold">Diamond Tools &amp; Equipment Est.</span></p>
</div>`;

  return { text, html };
}

// Sends the PO email with the PDF attached, or returns a preview result when
// SMTP is not configured (development mode). Never claims it was sent when it
// was only previewed.
export async function sendPOEmail(args: SendPOEmailArgs): Promise<SendResult> {
  const { text, html } = buildBody(args);
  const attachments = [
    {
      filename: `${args.poNumber}.pdf`,
      content: args.pdf,
      contentType: "application/pdf",
    },
  ];

  if (!isConfigured()) {
    return {
      mode: "preview",
      message:
        "Email settings are not configured — the order was saved and the email was prepared in PREVIEW mode (not actually sent).",
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: args.to,
    cc: args.cc.length ? args.cc : undefined,
    subject: args.subject,
    text,
    html,
    attachments,
  });

  return {
    mode: "sent",
    message: `Email sent successfully to ${args.to}${
      args.cc.length ? " (CC: " + args.cc.join(", ") + ")" : ""
    }.`,
    messageId: info.messageId,
  };
}

export function emailConfigured(): boolean {
  return isConfigured();
}
