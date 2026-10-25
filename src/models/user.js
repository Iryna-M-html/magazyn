import { model, Schema } from 'mongoose';
import { USER_ROLES } from '../constants/roles.js';
import { toLoginName } from '../utils/loginName.js';

const userSchema = new Schema(
  {
    // admin — администратор, owner — руководитель, user — продавец
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      default: 'user',
      enum: USER_ROLES,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    // «Имя Фамилия» — показывается в шапке приложения
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    // Нормализованное «имя фамилия» для входа (без учёта регистра и лишних пробелов).
    // Не уникально: при совпадении имён пользователь определяется по коду.
    loginName: {
      type: String,
      index: true,
    },
    // Необязателен: вход по имени и коду. sparse — чтобы у многих пользователей могло не быть email
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      required: false,
      default: '',
    },

    // true — пользователь вошёл с кодом от администратора и должен задать свой
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false },
);

userSchema.pre('validate', function () {
  if (this.firstName && this.lastName) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }

  if (this.fullName) {
    this.loginName = toLoginName(this.fullName);
  }
});

userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;
  delete obj.personalCode;
  delete obj.loginName;

  return obj;
};

export const User = model('User', userSchema);
