import crypto from "crypto";
import ErrorHandler from "../middleware/error.js";

export const generateRandomPassword = (length = 12) => {
  if (length < 8 || length > 32) {
    throw new ErrorHandler(
      "Password length must be between 8 and 32 characters"
    );
  }

  // Use base64 to get a readable, strong password, remove non-alphanumeric symbols
  let password = crypto
    .randomBytes(length)
    .toString("base64") // base64 is ~1.33x longer than raw bytes
    .replace(/[^a-zA-Z0-9]/g, "") // remove special characters
    .slice(0, length); // limit to exact length

  // Ensure it meets minimum requirements after removing symbols
  while (password.length < length) {
    password += Math.random().toString(36).charAt(2); // pad with random letters
  }

  return password;
};
