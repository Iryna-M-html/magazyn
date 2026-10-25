import path from 'path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

// Языковые данные (pol, eng) скачиваются при первом запуске и кешируются здесь
const LANG_CACHE_PATH = path.resolve('.tesseract-cache');

let workerPromise = null;

// Один воркер на весь сервер: создание дорогое (загрузка модели ~несколько секунд)
const getWorker = () => {
  if (!workerPromise) {
    workerPromise = createWorker(['pol', 'eng'], 1, {
      cachePath: LANG_CACHE_PATH,
    }).then(async (worker) => {
      await worker.setParameters({
        // Сохранять пробелы между колонками таблицы
        preserve_interword_spaces: '1',
      });
      return worker;
    });

    // Не держать «сломанный» промис, если инициализация упала
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }

  return workerPromise;
};

/**
 * Подготовка фото для OCR: поворот по EXIF, ширина ~2400px, ч/б, выравнивание контраста, резкость.
 * Фото с телефона без этого распознаётся заметно хуже.
 */
const preprocess = (buffer) =>
  sharp(buffer)
    .rotate()
    .resize({ width: 2400, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();

// Очередь: один воркер обрабатывает фото по одному
let queue = Promise.resolve();

export const recognizeInvoiceText = (imageBuffer) => {
  const job = queue.then(async () => {
    const worker = await getWorker();
    const image = await preprocess(imageBuffer);
    const {
      data: { text, confidence },
    } = await worker.recognize(image);

    return { text, confidence };
  });

  queue = job.catch(() => {});

  return job;
};
