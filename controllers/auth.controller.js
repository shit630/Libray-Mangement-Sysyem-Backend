const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const UserModel = require("../models/user.model");
const { sendEmail, emailTemplates } = require("../utils/sendEmail");
const { uploadImage, deleteImage } = require("../configs/cloudinary");
const fs = require("fs");

// Generate JWT Token
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    data: user,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    let {
      fullName,
      email,
      password,
      dateOfBirth,
      address,
      role = "user",
    } = req.body;

    address = JSON.parse(address);

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "You are already registered",
      });
    }

    let profilePicture = null;

    //handle file upload if exists
    if (req.file) {
      try {
        const result = await uploadImage(
          req.file.path,
          "library-management/profiles"
        );

        profilePicture = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Error uploading profile picture",
        });
      }
    }
    const user = await UserModel.create({
      fullName,
      email,
      password,
      dateOfBirth,
      address,
      profilePicture,
      role,
    });

    // Send welcome email (async - don't wait for it)
    sendEmail({
      email: user.email,
      subject: "Welcome to LibraryHub!",
      html: emailTemplates.welcome(user),
    }).catch((error) => {
      console.error("Failed to send welcome email:", error);
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    if (req.file) {
      await deleteImage(req.file.filename).catch(console.error);
    }
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email and password",
      });
    }

    // Check for user
    const user = await UserModel.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  const user = await UserModel.findById(req.user.id).populate("favoriteBooks");
  res.status(200).json({
    success: true,
    data: user,
  });
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
const updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      fullName: req.body.fullName,
      email: req.body.email,
      dateOfBirth: req.body.dateOfBirth,
      address: JSON.parse(req.body.address),
    };

    //Handle profile picture upload
    if (req.file) {
      try {
        //Delete old image if exists
        if (req.user.profilePicture && req.user.profilePicture.public_id) {
          await deleteImage(req.user.profilePicture.public_id);
        }

        //Upload new image
        const result = await uploadImage(
          req.file.path,
          "library-management/profiles"
        );

        fieldsToUpdate.profilePicture = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } catch (error) {
        return res.status(400).json({
          success: true,
          message: "Error uploading profile picture",
        });
      }
    }
    const user = await UserModel.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (req.file) {
      await deleteImage(req.file.filename).catch(console.error);
    }
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res, next) => {
  const user = await UserModel.findById(req.user.id).select("+password");

  // Check current password
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return res.status(401).json({
      success: false,
      message: "Password is incorrect",
    });
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "There is no user with that email",
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;

    try {
      // Send email
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request - LibraryHub",
        html: emailTemplates.passwordReset(resetUrl, user),
      });

      res.status(200).json({ success: true, message: "Email sent" });
    } catch (error) {
      //  Clear the reset token if email fails
      user.clearResetToken();
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: "Email could not be sent",
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");

  const user = await UserModel.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid token",
    });
  }

  // Set new password
  user.password = req.body.password;
  (user.resetPasswordToken = undefined), (user.resetPasswordExpire = undefined);
  await user.save();

  sendTokenResponse(user, 200, res);
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
};
