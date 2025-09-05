import config from "./config.js";


export const registerUserEmailTemplate = (user) => {
  const name = user.name || "Guest";

  return {
    subject: "Welcome to ELEQT ✨",
    message: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; background-color: #0d0d0d; color: #f5f5f5; border-radius: 12px; border: 1px solid #2c2c2c;">
        <h2 style="color: #FFD700; font-weight: 600; font-size: 28px;">Welcome aboard, ${name} 🛬</h2>

        <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">
          Your journey with <strong style="color: #FFD700;">ELEQT</strong> begins now — where sophistication meets seamless travel. 🚘✨
        </p>

        <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">
          As a valued guest, you're now part of a premium experience designed for elegance, comfort, and excellence. Our bespoke chauffeur services are at your fingertips — for events, evenings, or every occasion that deserves more than just a ride.
        </p>

        <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6; margin-top: 30px;">
          We’re delighted to have you with us. Let the journey begin. 🥂
        </p>

        <p style="font-size: 16px; color: #FFD700; margin-top: 40px;">
          With warm regards,<br />
          <strong>Team ELEQT</strong> ✨🎉
        </p>

        <hr style="border: none; border-top: 1px solid #444; margin: 40px 0;" />

        <p style="font-size: 13px; color: #999;">
          This message was sent to <strong>${user.email}</strong> by ELEQT. If this wasn’t you, kindly disregard this message.
        </p>
      </div>
    `,
  };
};

export const resetPasswordEmailTemplate = (user, resetToken) => {
  const name = user.name || "User";
  const appUrl = config.FRONTEND_URL;
  const resetPasswordUrl = `${appUrl}/reset-password/${resetToken}`;

  return {
    subject: "ELEQT Password Reset Request",
    message: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #007BFF;">Hi ${name},</h2>

        <p style="font-size: 16px; color: #333;">
          We received a request to reset the password for your <strong>ELEQT</strong> account.
        </p>

        <p style="font-size: 16px; color: #333;">
          You can reset your password by clicking the button below:
        </p>

        <a href="${resetPasswordUrl}" style="display: inline-block; padding: 12px 20px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Reset Password
        </a>

        <p style="font-size: 15px; color: #555;">
          If you did not request this, please ignore this email. This link will expire after a limited time for security reasons.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="font-size: 13px; color: #aaa;">
          This message was sent to ${user.email}. If you have any concerns, please contact our support team.
        </p>
      </div>
    `,
  };
};

export const passwordChangedEmailTemplate = (user) => {
  const name = user.name || "User";

  return {
    subject: "Your ELEQT Password Was Changed",
    message: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #007BFF;">Hi ${name},</h2>

        <p style="font-size: 16px; color: #333;">
          This is a confirmation that your password was successfully changed on your <strong>ELEQT</strong> account.
        </p>

        <p style="font-size: 15px; color: #333;">
          If you did not initiate this change, please <a href="${process.env.FRONTEND_URL}/auth/password/forgot" style="color: #007BFF; text-decoration: underline;">reset your password immediately</a> or contact our support team for assistance.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="font-size: 13px; color: #aaa;">
          This email was sent to ${user.email}. If you did not make this change, we strongly recommend taking immediate action.
        </p>
      </div>
    `,
  };
};

export const accountDeletionEmailTemplate = (user) => {
  const name = user.name || "User";
  const appUrl = config.FRONTEND_URL;

  return {
    subject: "ELEQT Account Deletion Request Received",
    message: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #cc0000;">Hi ${name},</h2>

        <p style="font-size: 16px; color: #333;">
          We’ve received a request to delete your <strong>ELEQT</strong> account.
        </p>

        <p style="font-size: 16px; color: #333;">
          If <strong>you did not make this request</strong>, you can recover your account within <strong>72 hours</strong> by logging in at the link below:
        </p>

        <a href="${appUrl}/user/recover-account" style="display: inline-block; padding: 12px 20px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          Recover My Account
        </a>

        <p style="font-size: 15px; color: #555; margin-top: 20px;">
          After 72 hours, this self-recovery option will expire. Beyond that, your account can only be recovered by contacting our support team within the next <strong>30 days</strong> from the date of this request.
        </p>

        <p style="font-size: 15px; color: #555;">
          If no action is taken, your account and data will be permanently deleted after 30 days.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="font-size: 13px; color: #aaa;">
          This message was sent to ${user.email}. If you need help, please contact support.
        </p>
      </div>
    `,
  };
};

export const accountRecoverySuccessTemplate = (user) => {
  const name = user.name || "User";
  const appUrl = config.FRONTEND_URL;

  return {
    subject: "Your ELEQT Account Has Been Recovered",
    message: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #28a745;">Hi ${name},</h2>

        <p style="font-size: 16px; color: #333;">
          We’re happy to let you know that your <strong>ELEQT</strong> account deletion request has been successfully canceled, and your account is now fully active again.
        </p>

        <p style="font-size: 15px; color: #333;">
          If you mistakenly initiated the deletion or changed your mind — no worries, your data is safe and your account access has been restored.
        </p>

        <p style="font-size: 15px; color: #333;">
          You can now continue using ELEQT as usual. Just <a href="${appUrl}/auth/login" style="color: #007BFF; text-decoration: underline;">log in here</a> to get started.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="font-size: 13px; color: #999;">
          If you have any concerns or need assistance, feel free to contact our support team anytime.
        </p>

        <p style="font-size: 14px; color: #555;">– The ELEQT Team</p>
      </div>
    `,
  };
};

export const adminWelcomeEmailTemplate = ({ name, email, password }) => {
  const appUrl = config.ADMIN_URL || "https://admin.eleqt.in";

  return {
    subject: "Welcome to ELEQT Admin Portal",
    message: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
    <h2 style="color: #333;">Welcome to <span style="color: #007bff;">ELEQT Admin Portal</span>, ${name}!</h2>
    
    <p style="font-size: 16px; color: #555;">
      You have been successfully registered as an admin. Below are your credentials to log in and manage the platform. Please keep them secure.
    </p>

    <div style="background-color: #fff; padding: 15px 20px; border-radius: 6px; border: 1px solid #ddd; margin-top: 20px;">
      <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
      <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 8px 0;"><strong>Password:</strong> <code style="background-color: #f0f0f0; padding: 3px 6px; border-radius: 4px;">${password}</code></p>
    </div>

    <p style="font-size: 15px; color: #555; margin-top: 20px;">
      For security reasons, we recommend that you log in and change your password immediately.
    </p>

    <a href="${appUrl}/auth/login"
       style="display: inline-block; margin-top: 20px; padding: 12px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
      Go to Admin Login
    </a>

    <p style="font-size: 14px; color: #888; margin-top: 30px;">
      If you have any questions, feel free to reach out to support.
    </p>

    <p style="font-size: 14px; color: #aaa;">— ELEQT Team</p>
  </div>
`,
  };
};

export const eventRegistrationEmailTemplate = (user, event) => {
  const subject = "ELEQT Event Registration Received";

  const message = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
    <h2 style="color: #4CAF50;">Hi ${user.name},</h2>

    <p>Thank you for registering your event with <strong>ELEQT</strong>. We have received your request and will get back to you as soon as possible.</p>

    <div style="border: 1px solid #ddd; padding: 16px; border-radius: 8px; background-color: #f9f9f9;">
      <h3 style="margin-top: 0; color: #333;">📌 Event Details</h3>
      <p><strong>Type:</strong> ${event.eventType}</p>
      <p><strong>Organizer:</strong> ${event.organizerName}</p>
      <p><strong>Phone:</strong> ${event.organizerPhone}</p>
      <p><strong>Description:</strong> ${event.desc}</p>
    </div>

    <p>📞 A member of our team will contact you soon to confirm and guide you through the next steps.</p>

    <p>If you have any urgent questions, feel free to reach out to our support.</p>

    <p style="margin-top: 32px;">Warm regards,<br/><strong>ELEQT Team</strong></p>
    <hr style="margin-top: 40px;"/>
    <p style="font-size: 12px; color: #999;">This is an automated message. Please do not reply to this email.</p>
  </div>
  `;

  return { subject, message };
};
