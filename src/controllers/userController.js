import createHttpError from 'http-errors';
import bcrypt from 'bcrypt';
import { generateAccessCode } from '../utils/generators/generateAccessCode.js';
import { logAction } from '../services/auditLog.js';
import { User } from '../models/user.js';
import { clearSessionCookies } from '../services/auth.js';
import { Session } from '../models/session.js';
import {
  deleteFileFromCloudinary,
  saveFileToCloudinary,
} from '../utils/saveFileToCloudinary.js';

// import { Session } from '../models/session.js';

// ---------- Администратор: пользователи ----------

export const getAllUsers = async (req, res) => {
  const users = await User.find().sort({ lastName: 1, firstName: 1, fullName: 1 });

  res.status(200).json({
    success: true,
    data: users,
  });
};

// Код доступа генерируется автоматически и возвращается один раз — в базе хранится только хеш
export const createUser = async (req, res) => {
  const { firstName, lastName, role } = req.body;

  const accessCode = generateAccessCode();

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    role,
    password: await bcrypt.hash(accessCode, 10),
    isFirstLogin: true,
  });

  await logAction(req, {
    action: 'user.created',
    entityType: 'user',
    entityId: user._id,
    entityLabel: user.fullName,
    details: { role: user.role },
  });

  res.status(201).json({
    success: true,
    data: { user, accessCode },
  });
};

// Новый код вместо забытого: пользователь выходит на всех устройствах и при входе задаёт свой код
export const resetUserPassword = async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const accessCode = generateAccessCode();

  user.password = await bcrypt.hash(accessCode, 10);
  user.isFirstLogin = true;
  await user.save();

  await Session.deleteMany({ userId: user._id });

  await logAction(req, {
    action: 'user.code_reset',
    entityType: 'user',
    entityId: user._id,
    entityLabel: user.fullName,
    details: { role: user.role },
  });

  res.status(200).json({
    success: true,
    data: { user, accessCode },
  });
};

export const getProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
};
export const updateProfile = async (req, res) => {
  const allowedUpdates = ['fullName', 'avatar', 'role'];
  const updates = {};

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }
  if (req.body.email) {
    throw createHttpError(
      400,
      'Email address cannot be changed through this endpoint',
    );
  }
  if (Object.keys(updates).length === 0) {
    throw createHttpError(
      400,
      'Request body does not contain any fields to update',
    );
  }
  const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
  });
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedUser,
  });
};
export const deleteProfile = async (req, res) => {
  const { _id, avatar_id } = req.user;

  if (avatar_id) {
    await deleteFileFromCloudinary(avatar_id);
  }
  await Session.deleteMany({ userId: _id });

  await User.findByIdAndDelete(_id);

  clearSessionCookies(res);

  // res.status(204).send();
  res.status(200).json({
    success: true,
    message: 'Profile deleted successfully',
  });
};
export const updateUserAvatar = async (req, res) => {
  if (!req.file) {
    throw createHttpError(
      400,
      'No file uploaded. Please include an image file',
    );
  }
  const result = await saveFileToCloudinary(req.file.buffer, 'avatars');

  if (req.user.avatar_id && req.user.avatar_id !== '') {
    await deleteFileFromCloudinary(req.user.avatar_id);
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      avatar: result.secure_url,
      avatar_id: result.public_id,
    },
    { new: true },
  );
  res.status(200).json({
    success: true,
    message: 'Avatar updated successfully',
    data: {
      avatar: user.avatar,
    },
  });
};

export const getUser = async (req, res) => {
  const user = req.user;

  if (!user) {
    throw createHttpError(401, 'Not authenticated');
  }

  res.status(200).json({
    success: true,
    user: user,
  });
};
