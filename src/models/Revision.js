import mongoose from 'mongoose';

const revisionItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  expectedQuantity: {
    type: Number,
    required: true,
    default: 0,
  }, // Сколько должно быть по базе
  actualQuantity: {
    type: Number,
    required: true,
    default: 0,
  }, // Сколько насчитали по факту
  difference: {
    type: Number,
    required: true,
    default: 0,
  }, // Расхождение: actualQuantity - expectedQuantity (минус — недостача, плюс — излишек)
  notes: {
    type: String,
    default: '',
  }, // Причина списания / комментарий
});

const revisionSchema = new mongoose.Schema(
  {
    revisionDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    }, // Например: 2026
    month: {
      type: Number,
      required: true,
    }, // Например: 9 (Сентябрь)
    items: [revisionItemSchema],
    status: {
      type: String,
      enum: ['draft', 'completed'],
      default: 'completed',
    },
    note: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

// Индекс для быстрого поиска ревизии по году и месяцу
revisionSchema.index({ year: 1, month: 1 }, { unique: true });

export default mongoose.model('Revision', revisionSchema);
