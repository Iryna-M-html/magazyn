import { Schema, model } from 'mongoose';
import { calcPriceBrutto, parseVatRate } from '../utils/vat.js';

const intakeSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },

    scannedAt: {
      type: Date,
      default: Date.now,
    },

    discountedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    writtenOffQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    batch: {
      type: String,
      trim: true,
      default: null,
    },

    expirationDate: {
      type: Date,
      required: true,
    },

    // Цена нетто за 1 шт. при приёмке партии; брутто считается автоматически (virtual priceBrutto)
    priceNetto: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  },
);

intakeSchema.virtual('remainingQuantity').get(function () {
  return this.quantity - (this.discountedQuantity + this.writtenOffQuantity);
});

// Ставка VAT из категории товара — доступна, только если productId populate-нут с полем category
intakeSchema.virtual('vatRate').get(function () {
  const product = this.populated('productId') ? this.productId : null;

  return parseVatRate(product?.category);
});

intakeSchema.virtual('priceBrutto').get(function () {
  return calcPriceBrutto(this.priceNetto, this.vatRate);
});

export const Intake = model('Intake', intakeSchema);
