export const validateBody = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Ошибка валидации',
      details: error.details.map((d) => d.message),
    });
  }
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.params, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Некорректные параметры запроса',
      details: error.details.map((d) => d.message),
    });
  }
  next();
};
