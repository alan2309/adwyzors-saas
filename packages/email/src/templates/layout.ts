/**
 * Shared HTML email layout wrapper.
 * Provides consistent styling across all transactional emails.
 */
export function emailLayout(content: string, footerText?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Adwyzors</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#18181b;padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">Adwyzors</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e4e4e7;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                ${footerText ?? "This is an automated message from Adwyzors ERP. Please do not reply directly."}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
