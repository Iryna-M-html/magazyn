// models/InventoryAudit.js
import { Schema, model } from 'mongoose';

const inventoryAuditSchema = new Schema(
  {
    intakeId: {
      type: Schema.Types.ObjectId,
      ref: 'Intake',
      required: true,
      index: true,
    },
    expectedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    countedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    difference: {
      type: Number,
      required: true,
    },
    countedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const InventoryAudit = model('InventoryAudit', inventoryAuditSchema);
export default InventoryAudit;
