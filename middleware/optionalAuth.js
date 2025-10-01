const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      req.user = null; // guest
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await UserModel.findById(decoded.id).select("-password");
    } catch (error) {
      req.user = null; // invalid token = treat as guest
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = optionalAuth;
