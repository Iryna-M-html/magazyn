import { Schema, model } from 'mongoose';
import { CATEGORIES } from '../constants/categories.js';

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
    productQuantity: { type: Number, default: null },
    productQuantityUnit: { type: String, default: '', trim: true },
    category: {
      type: String,
      enum: CATEGORIES,
      default: 'Другое',
      trim: true,
    },
    shelfPrice: { type: Number, default: null, min: 0 },
  },
  { timestamps: true },
);

export const Product = model('Product', productSchema);
