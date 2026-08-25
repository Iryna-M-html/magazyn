import { Schema, model } from 'mongoose';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    barcode: { type: String, required: true, unique: true, index: true },
    brand: { type: String, default: 'Не указан', trim: true },
    imageUrl: { type: String, default: '' },
    source: {
      type: String,
      enum: ['MANUAL', 'OPEN_FOOD_FACTS'],
      default: 'MANUAL',
    },
  },
  { timestamps: true },
);

export const Product = model('Product', productSchema);
