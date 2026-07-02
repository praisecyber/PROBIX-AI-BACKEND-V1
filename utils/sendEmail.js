const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Probix <onboarding@resend.dev>",
      to: options.email,
      subject: options.subject,
      html: options.html,
    });
    return data;
  } catch (error) {
    console.error("Email sending failed:", error);
    // Returning error so the caller can decide what to do
    return null;
  }
};

module.exports = sendEmail;
