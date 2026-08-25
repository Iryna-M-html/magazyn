import createHttpError from 'http-errors';
import Category from '../models/category.js';

export const getAllCategories = async (req, res, next) => {
  try {
    const categoriesList = await Category.find().select('title');

    res.status(200).json({
      status: 'success',
      data: categoriesList,
    });
  } catch (error) {
    next(error);
  }
};
export const createCategory = async (req, res) => {
  const { title } = req.body;

  if (!title) {
    throw createHttpError(400, "The 'title' field is required");
  }

  const existingCategory = await Category.findOne({ title });

  if (existingCategory) {
    throw createHttpError(409, 'A category with this name already exists');
  }

  const category = await Category.create({ title });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    category,
  });
};
