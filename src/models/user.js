import { model, Schema } from 'mongoose';

const userSchema = new Schema(
  {
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      default: 'user',
      enum: ['admin', 'user', 'owner'],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        console.log('password validator this:', this);
        console.log('password validator this.role:', this.role);
        return this.role !== 'operator';
      },
    },
    avatar: {
      type: String,
      required: false,
      default: '',
    },

    isFirstLogin: {
      type: Boolean,
      default: true, // Чтобы отследить первый вход и заставить сменить пароль
    },
  },
  { timestamps: true, versionKey: false },
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;
  delete obj.personalCode;

  return obj;
};

export const User = model('User', userSchema);
