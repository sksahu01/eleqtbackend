import nodeMailer from "nodemailer";
import config from "./config.js";

export const sendEmail = async ({ email, subject, message }) => {
  const transporter = nodeMailer.createTransport({
    host: config.SMTP_HOST,
    service: config.SMTP_SERVICE,
    port: config.SMTP_PORT,
    auth: {
      user: config.SMTP_MAIL,
      pass: config.SMTP_PASSWORD,
    },
  });

  const options = {
    from: config.SMTP_MAIL,
    to: email,
    subject,
    html: message,
  };
  await transporter.sendMail(options);
};
