import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000"; // Default to localhost if not set
const FRONTEND_URL = process.env.FRONTEND_URL || "https://resetpassword-eleqt.vercel.app"; // Default to localhost if not set
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_SERVICE = process.env.SMTP_SERVICE;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_MAIL = process.env.SMTP_MAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const JWT_EXPIRE = process.env.JWT_EXPIRE;
const COOKIE_EXPIRE = process.env.COOKIE_EXPIRE || "7"; // Default to 7 days if not set
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET_KEY = process.env.RAZORPAY_SECRET_KEY;
const PAYMENT_ENC_KEY = process.env.PAYMENT_ENC_KEY;
const ADMIN_URL = process.env.ADMIN_URL || "https://admin.eleqt.in"; // Default to admin.eleqt.in if not set

const MONGO_URI =
  process.env.NODE_ENV === "production"
    ? process.env.MONGO_URI_PROD
    : process.env.MONGO_URI_DEV;

const config = {
  PORT,
  BACKEND_URL,
  FRONTEND_URL,
  MONGO_URI,
  TWILIO_SID,
  TWILIO_PHONE_NUMBER,
  TWILIO_AUTH_TOKEN,
  SMTP_HOST,
  SMTP_SERVICE,
  SMTP_PORT,
  SMTP_MAIL,
  SMTP_PASSWORD,
  JWT_SECRET_KEY,
  JWT_EXPIRE,
  COOKIE_EXPIRE,
  RAZORPAY_KEY_ID,
  RAZORPAY_SECRET_KEY,
  ADMIN_URL,
  PAYMENT_ENC_KEY,
};

export default config;
