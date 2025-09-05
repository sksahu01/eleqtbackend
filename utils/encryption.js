import crypto from "crypto";
import ErrorHandler from "../middleware/error.js";

const ALGORITHM = "aes-256-cbc";
const KEY = process.env.PAYMENT_ENC_KEY;

if (!KEY || KEY.length !== 32) {
  throw new ErrorHandler(
    "PAYMENT_ENC_KEY must be defined and 32 characters long.",
    500
  );
}

function encryptOptions(optionsObj) {
  try {
    const iv = crypto.randomBytes(16); // Generate fresh IV each time
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY), iv);

    const json = JSON.stringify(optionsObj);
    let encrypted = cipher.update(json, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
      iv: iv.toString("hex"),
      encryptedData: encrypted,
    };
  } catch (err) {
    console.error("Encryption failed:", err);
    throw new ErrorHandler("Failed to encrypt payment options", 500);
  }
}

export { encryptOptions };
