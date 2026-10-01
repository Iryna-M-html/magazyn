import { Schema, model } from 'mongoose';

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

export const Intake = model('Intake', intakeSchema);
