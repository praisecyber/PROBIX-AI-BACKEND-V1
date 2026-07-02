const getWelcomeEmailHtml = (fullname) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Probix</title>
    <style>
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: #f3f4f6;
        margin: 0;
        padding: 0;
        color: #1f2937;
      }
      .email-wrapper {
        width: 100%;
        background-color: #f3f4f6;
        padding: 40px 0;
      }
      .email-content {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      .header {
        background-color: #111827;
        padding: 30px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        color: #10b981;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .body {
        padding: 40px 30px;
        line-height: 1.6;
        color: #4b5563;
      }
      .body h2 {
        color: #111827;
        font-size: 20px;
        margin-top: 0;
        margin-bottom: 20px;
      }
      .body p {
        font-size: 16px;
        margin-bottom: 20px;
      }
      .cta-button {
        display: inline-block;
        background-color: #10b981;
        color: #ffffff;
        text-decoration: none;
        padding: 14px 28px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        margin-top: 10px;
        text-align: center;
      }
      .footer {
        background-color: #f9fafb;
        padding: 20px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
      }
      .footer p {
        margin: 0;
        color: #9ca3af;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <div class="email-content">
        <div class="header">
          <h1>Probix</h1>
        </div>
        <div class="body">
          <h2>Welcome aboard, ${fullname}! 🚀</h2>
          <p>We are absolutely thrilled to welcome you to <strong>Probix</strong>. You've just taken the first step towards a more seamless, secure, and powerful experience.</p>
          <p>Our mission is to help you unlock new possibilities and streamline your workflow like never before. From powerful digital tools to intuitive design, we've built everything with you in mind.</p>
          <p>Ready to get started? Log in to your dashboard to explore all the newly unlocked features waiting for you.</p>
          <div style="text-align: center; margin-top: 10px; margin-bottom: 30px;">
            <a href="#" class="cta-button" style="color: #ffffff;">Go to Dashboard</a>
          </div>
          <p>If you have any questions or need a hand, our support team is always just a reply away.</p>
          <p>Cheers,<br>The Probix Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Probix. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};

const getWaitlistEmailHtml = (fullname, position) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're on the Probix Waitlist!</title>
    <style>
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: #f3f4f6;
        margin: 0;
        padding: 0;
        color: #1f2937;
      }
      .email-wrapper {
        width: 100%;
        background-color: #f3f4f6;
        padding: 40px 0;
      }
      .email-content {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      .header {
        background-color: #111827;
        padding: 30px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        color: #10b981;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .body {
        padding: 40px 30px;
        line-height: 1.6;
        color: #4b5563;
      }
      .body h2 {
        color: #111827;
        font-size: 20px;
        margin-top: 0;
        margin-bottom: 20px;
      }
      .body p {
        font-size: 16px;
        margin-bottom: 20px;
      }
      .highlight-box {
        background-color: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        margin-bottom: 30px;
      }
      .position-label {
        font-size: 14px;
        text-transform: uppercase;
        color: #059669;
        font-weight: 700;
        letter-spacing: 1px;
      }
      .position-number {
        font-size: 48px;
        font-weight: 800;
        color: #10b981;
        margin: 10px 0 0 0;
        line-height: 1;
      }
      .footer {
        background-color: #f9fafb;
        padding: 20px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
      }
      .footer p {
        margin: 0;
        color: #9ca3af;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <div class="email-content">
        <div class="header">
          <h1>Probix</h1>
        </div>
        <div class="body">
          <h2>You're officially on the list! 🎉</h2>
          <p>Hi ${fullname},</p>
          <p>Thank you for requesting access to <strong>Probix</strong>! We are currently putting the final touches on our platform, and we couldn't be more excited to have you join us early.</p>
          
          <div class="highlight-box">
            <div class="position-label">Your Waitlist Position</div>
            <div class="position-number">#${position}</div>
          </div>
          
          <p>We'll send you an exclusive invite the moment your access is ready. In the meantime, keep an eye on your inbox for sneak peeks, product updates, and early-bird perks.</p>
          <p>Thank you for your support and patience—it's going to be worth the wait!</p>
          <p>Warmly,<br>The Probix Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Probix. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};

const getResetPasswordEmailHtml = (fullname, code) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: #f3f4f6;
        margin: 0;
        padding: 0;
        color: #1f2937;
      }
      .email-wrapper {
        width: 100%;
        background-color: #f3f4f6;
        padding: 40px 0;
      }
      .email-content {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      .header {
        background-color: #111827;
        padding: 30px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        color: #10b981;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .body {
        padding: 40px 30px;
        line-height: 1.6;
        color: #4b5563;
      }
      .body h2 {
        color: #111827;
        font-size: 20px;
        margin-top: 0;
        margin-bottom: 20px;
      }
      .body p {
        font-size: 16px;
        margin-bottom: 20px;
      }
      .highlight-box {
        background-color: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        margin-bottom: 30px;
      }
      .code-label {
        font-size: 14px;
        text-transform: uppercase;
        color: #059669;
        font-weight: 700;
        letter-spacing: 1px;
      }
      .code-number {
        font-size: 48px;
        font-weight: 800;
        color: #10b981;
        margin: 10px 0 0 0;
        line-height: 1;
        letter-spacing: 8px;
      }
      .footer {
        background-color: #f9fafb;
        padding: 20px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
      }
      .footer p {
        margin: 0;
        color: #9ca3af;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <div class="email-content">
        <div class="header">
          <h1>Probix</h1>
        </div>
        <div class="body">
          <h2>Password Reset Request 🔑</h2>
          <p>Hi ${fullname},</p>
          <p>We received a request to reset the password for your Probix account. If you didn't make this request, you can safely ignore this email.</p>
          
          <div class="highlight-box">
            <div class="code-label">Your Verification Code</div>
            <div class="code-number">${code}</div>
          </div>
          
          <p>This code is valid for the next 15 minutes. Enter it securely on the password reset page to choose a new password.</p>
          <p>Stay Safe,<br>The Probix Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Probix. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = {
  getWelcomeEmailHtml,
  getWaitlistEmailHtml,
  getResetPasswordEmailHtml
};
