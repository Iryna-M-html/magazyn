import { Schema, model } from 'mongoose';

const intakeSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, default: 1 },
    scannedAt: { type: Date, default: Date.now },
    batch: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

export const Intake = model('Intake', intakeSchema);
