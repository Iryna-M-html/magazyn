import { Schema, model } from 'mongoose';

const categorySchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Category title is required'],
      trim: true,
    },

    keywords: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default model('Category', categorySchema);
