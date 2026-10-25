import createHttpError from 'http-errors';
import { User } from '../models/user.js';
import bcrypt from 'bcrypt';
import { createSession, setSessionCookies } from '../services/auth.js';
import { Session } from '../models/session.js';
import { toLoginName } from '../utils/loginName.js';

export const registerUser = async (req, res) => {
  const { role, fullName, email, password, personalCode } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { personalCode: personalCode || null }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      if (existingUser.role !== 'operator') {
        throw createHttpError(400, 'Email address is already in use');
      }
    }
    if (personalCode && existingUser.personalCode === personalCode) {
      throw createHttpError(400, 'Personal code is already in use');
    }
  }

  let hashedPassword = null;

  if (role !== 'operator') {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  const newUser = await User.create({
    fullName,
    email,
    password: role === 'operator' ? undefined : hashedPassword,
    personalCode: role === 'operator' ? personalCode : undefined,
    role,
  });
  const newSession = await createSession(newUser._id);
  setSessionCookies(res, newSession);

  res.status(201).json(newUser);
};

export const refreshUserSession = async (req, res, next) => {
  const session = await Session.findOne({
    _id: req.cookies.sessionId,
    refreshToken: req.cookies.refreshToken,
  });
  if (!session) {
    throw createHttpError(401, 'Session not found');
  }
  const isSessionTokenExpired =
    new Date() > new Date(session.refreshTokenValidUntil);
  if (isSessionTokenExpired) {
    throw createHttpError(401, 'Session token expired');
  }
  await Session.deleteOne({
    _id: req.cookies.sessionId,
    refreshToken: req.cookies.refreshToken,
  });
  const newSession = await createSession(session.userId);
  setSessionCookies(res, newSession);

  res.status(200).json({
    message: 'Successfully refreshed a session',
  });
};

///login
// Сотрудники входят по имени, фамилии и коду; пользователи с email — по email и паролю
export const loginUser = async (req, res, next) => {
  try {
    const { email, firstName, lastName, password } = req.body;

    let user = null;

    if (email) {
      const candidate = await User.findOne({ email });

      if (candidate && (await bcrypt.compare(password, candidate.password))) {
        user = candidate;
      }
    } else {
      // Имена не уникальны — при совпадении пользователь определяется по коду
      const candidates = await User.find({
        loginName: toLoginName(`${firstName} ${lastName}`),
      });

      for (const candidate of candidates) {
        if (await bcrypt.compare(password, candidate.password)) {
          user = candidate;
          break;
        }
      }
    }

    if (!user) {
      throw createHttpError(401, 'Invalid credentials');
    }

    await Session.deleteOne({ userId: user._id });
    const newSession = await createSession(user._id);
    setSessionCookies(res, newSession);

    return res.status(200).json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role, // 'user' — продавец, 'admin' — администратор, 'owner' — руководитель
      },
      mustChangePassword: user.isFirstLogin || false,
    });
  } catch (error) {
    next(error);
  }
};

// Смена кода самим пользователем (обязательна после входа с кодом от администратора)
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw createHttpError(400, 'Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw createHttpError(400, 'New password must be different');
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.isFirstLogin = false;
  await user.save();

  res.status(200).json({ message: 'Password changed successfully' });
};

export const logoutUser = async (req, res) => {
  const { sessionId } = req.cookies;

  if (sessionId) {
    await Session.deleteOne({ _id: sessionId });
  }

  res.clearCookie('sessionId');
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(204).send();
};
