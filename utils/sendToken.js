import config from "./config.js";

export const sendToken = (user, statusCode, message, res) => {
  const token = user.generateToken();
  res
    .status(statusCode)
    .cookie("userToken", token, {
      expires: new Date(
        Date.now() + config.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    })
    .json({
      success: true,
      user,
      message,
      token,
    });
};

export const sendTokenAdmin = (admin, statusCode, message, res) => {
  const token = admin.generateToken();
  res
    .status(statusCode)
    .cookie("adminToken", token, {
      expires: new Date(
        Date.now() + config.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    })
    .json({
      success: true,
      admin,
      message,
      token,
    });
};
