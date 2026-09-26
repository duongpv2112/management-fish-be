const bcrypt = require("bcryptjs");
const { TEST_PASSWORD, TEST_JWT_SECRET } = require("./helpers/auth");

// Biến môi trường đăng nhập cho test (không phải giá trị thật)
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.APP_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
