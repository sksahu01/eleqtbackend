import twilio from "twilio";
import config from "../utils/config.js";

const client = twilio(config.TWILIO_SID, config.TWILIO_AUTH_TOKEN);

export async function sendVerificationCodeViaPhone(
  verificationCode,
  name,
  phone,
  res
) {
  try {
    const message = `Hello ${name}, your verification code is ${verificationCode}. Please enter this code to verify your account. The code is valid for 10 minutes.`;

    await client.messages.create({
      body: message,
      from: config.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    res.status(200).json({
      success: true,
      message: `OTP sent.`,
    });
  } catch (error) {
    // logger.error("Error sending verification code:", error);
    // If sending the verification code fails, we can handle it gracefully

    return res.status(500).json({
      success: false,
      message: "Verification code failed to send." + error.message,
    });
  }
}
