type EmailDetails = {
  poNumber: string;
  attention?: string | null;
  preparedBy: string;
  revision?: number;
};

export function defaultEmailBody(args: EmailDetails): string {
  const greeting = args.attention ? `Dear ${args.attention},` : "Dear Sir/Madam,";
  if (args.revision && args.revision > 0) {
    const previous = args.revision === 1
      ? args.poNumber
      : `${args.poNumber} (rev${args.revision - 1})`;
    return `${greeting}

Please find attached our revised Purchase Order ${args.poNumber} (rev${args.revision}).
Kindly confirm receipt and share your revised order confirmation at your earliest convenience.

Note: Please cancel and disregard the previous Purchase Order ${previous} and proceed only with the attached revised version.

Best regards,
${args.preparedBy}
Diamond Tools & Equipment Est.`;
  }
  return `${greeting}

Please find attached our Purchase Order ${args.poNumber}.
Kindly confirm receipt and share your order confirmation at your convenience.

Best regards,
${args.preparedBy}
Diamond Tools & Equipment Est.`;
}

export function emailBodyHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;line-height:1.6">${escaped.replace(/\r\n|\r|\n/g, "<br/>")}</div>`;
}
