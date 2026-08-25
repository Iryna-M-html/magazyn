import { Schema } from 'mongoose';
import { model } from 'mongoose';
const productSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    image: {
      type: String,
      trim: true,
    },
    description: { type: String },
    stock: { type: Number, required: true },
    suppliers: { type: String, required: true },
    // userId: {
    //   type: Schema.Types.ObjectId,
    //   ref: 'User',
    //   required: true,
    // },
    averageRate: { type: Number, default: 0 },
    feedbackCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);
productSchema.index(
  {
    name: 'text',
    description: 'text',
  },
  { name: 'ProductTextIndex' },
);
productSchema.index({
  feedbackCount: -1,
  averageRate: -1,
  name: 1,
});
export const Product = model('Product', productSchema);
