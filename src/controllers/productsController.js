import { Product } from '../models/product.js';
import createHttpError from 'http-errors';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';
import mongoose from 'mongoose';

const buildFilterConditions = (queryParams) => {
  const { minPrice, maxPrice, category, search } = queryParams;
  const filterConditions = [];

  if (category) {
    if (category.includes(',')) {
      const categoryIds = category
        .split(',')
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (categoryIds.length > 0) {
        filterConditions.push({ category: { $in: categoryIds } });
      }
    } else if (mongoose.Types.ObjectId.isValid(category)) {
      filterConditions.push({ category: category });
    }
  }

  if (minPrice || maxPrice) {
    const priceCondition = {};
    if (minPrice) priceCondition.$gte = Number(minPrice);
    if (maxPrice) priceCondition.$lte = Number(maxPrice);
    filterConditions.push({ 'price.value': priceCondition });

    if (search) {
      filterConditions.push({ name: { $regex: search, $options: 'i' } });
    }

    return filterConditions.length > 0 ? { $and: filterConditions } : {};
  }
};

export const getAllProducts = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.perPage) || 5;
    const skip = (page - 1) * perPage;

    const filters = buildFilterConditions(req.query);

    const [totalItems, products] = await Promise.all([
      Product.countDocuments(filters),
      Product.find(filters).skip(skip).limit(perPage),
    ]);

    const totalPages = Math.ceil(totalItems / perPage);

    res.status(200).json({
      page,
      perPage,
      totalItems,
      totalPages,
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid product ID format' });
  }

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({ message: `Product not found` });
  }

  res.status(200).json(product);
};

export const createProduct = async (req, res) => {
  let imageUrl = null;

  if (req.file) {
    const cloudinaryResult = await saveFileToCloudinary(
      req.file.buffer,
      'product',
    );
    imageUrl = cloudinaryResult.secure_url;
  }
  const product = await Product.create({
    ...req.body,
    image: imageUrl,
    // userId: req.user._id,
  });
  res.status(201).json(product);
};

export const updateProduct = async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findOneAndUpdate(
    {
      _id: productId,
      userId: req.user._id,
    },
    req.body,
    {
      new: true,
    },
  );
  if (!product) {
    throw createHttpError(404, 'Product not found');
  }

  res.status(200).json(product);
};

export const deleteProduct = async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findOneAndDelete({
    _id: productId,
    userId: req.user._id,
  });

  if (!product) {
    throw createHttpError(404, 'Product not found');
  }

  res.status(200).json(product);
};
