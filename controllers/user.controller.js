const { deleteImage } = require("../configs/cloudinary");
const UserModel = require("../models/user.model");

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    let { search, role, page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);

    let query = {};
    if (search && search.trim()) {
      const searchRegex = search.trim().replace(/\s+/g, ".*");
      query.$or = [
        { fullName: { $regex: searchRegex, $options: "i" } },
        { email: { $regex: searchRegex, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    const totalUsers = await UserModel.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);
    const skip = (page - 1) * limit;

    const users = await UserModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-password");

    res.status(200).json({
      success: true,
      totalPages,
      totalUsers,
      page,
      limit,
      data: users,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
const getUser = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id).select("-password");
    // .populate("favoriteBooks", "title author image ratings");
    // .populate("borrowedBooks.book", "title author image ratings");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    //Delete profile picture from cloudinary if exists
    if (user.profilePicture && user.profilePicture.public_id) {
      await deleteImage(user.profilePicture.public_id);
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "User delete success",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add book to favorites
// @route   POST /api/users/favorites/:bookId
// @access  Private
const addToFavorites = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if already in favorites (compare as string)
    const alreadyFav = user.favoriteBooks.some(
      (bookId) => bookId.toString() === req.params.bookId.toString()
    );
    if (alreadyFav) {
      return res.status(400).json({
        success: false,
        message: "Book already in favorites",
      });
    }

    user.favoriteBooks.push(req.params.bookId);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Book added to favorites",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Remove book from favorites
// @route   DELETE /api/users/favorites/:bookId
// @access  Private
const removeFromFavorites = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isFav = user.favoriteBooks.some(
      (bookId) => bookId.toString() === req.params.bookId.toString()
    );
    if (!isFav) {
      return res.status(400).json({
        success: false,
        message: "Book not in your favorites",
      });
    }

    user.favoriteBooks = user.favoriteBooks.filter(
      (bookId) => bookId.toString() !== req.params.bookId.toString()
    );

    await user.save();

    res.status(200).json({
      success: true,
      message: "Book removed from favorites",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  addToFavorites,
  removeFromFavorites,
};
