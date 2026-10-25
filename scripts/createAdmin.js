// Создание администратора из консоли (первый вход в систему, когда пользователей ещё нет):
//   npm run create-admin -- Имя Фамилия
// Печатает имя и код доступа; при первом входе администратор задаёт свой код.
import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User } from '../src/models/user.js';
import { generateAccessCode } from '../src/utils/generators/generateAccessCode.js';
import { createUserSchema } from '../src/validations/usersValidation.js';

const [firstName, lastName] = process.argv.slice(2);

const { error } = createUserSchema.body.validate({ firstName, lastName, role: 'admin' });

if (error) {
  console.error(`Использование: npm run create-admin -- Имя Фамилия\n${error.message}`);
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URL);

try {
  // Индексы из схемы: email должен быть unique + sparse, иначе второй пользователь без email не создастся
  await User.syncIndexes();

  const accessCode = generateAccessCode();

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    role: 'admin',
    password: await bcrypt.hash(accessCode, 10),
    isFirstLogin: true,
  });

  console.log('Администратор создан');
  console.log(`  Имя и фамилия: ${user.fullName}`);
  console.log(`  Код доступа:   ${accessCode}`);
  console.log('При первом входе нужно будет задать свой код.');
} finally {
  await mongoose.disconnect();
}
