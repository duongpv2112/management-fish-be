// Chạy BE trên máy với MongoDB tạm trong bộ nhớ (mongodb-memory-server) và dữ liệu mẫu.
// Không cần .env hay Atlas; tắt server là mất hết dữ liệu.
//   npm run dev:local
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// Chỉ dùng cho DB tạm này, không phải mật khẩu thật
const DEV_PASSWORD = "dev-local";

const seedDemoData = async () => {
  const FishType = require("../app/models/fishType");
  const BasketType = require("../app/models/basketType");
  const fishWeightService = require("../app/services/fishWeight.service");

  if ((await FishType.countDocuments()) > 0) return;

  const tram = await FishType.create({ fishName: "Cá trắm" });
  // createdAt khác nhau để thứ tự loại cá trên bảng cố định
  await new Promise((resolve) => setTimeout(resolve, 5));
  const me = await FishType.create({ fishName: "Cá mè" });
  const bigBasket = await BasketType.create({ basketName: "Giỏ to", basketWeight: 2 });
  await BasketType.create({ basketName: "Giỏ nhỏ", basketWeight: 1 });

  for (const [fishType, fishWeight] of [[tram._id, 20], [me._id, 7.5]]) {
    const result = await fishWeightService.createFishWeight({ fishType, basketType: bigBasket._id, fishWeight });
    if (!result.ok) throw new Error(`Không tạo được dữ liệu mẫu: ${result.message}`);
  }

  // Ao 1 đang có vụ (phiên demo thuộc vụ này), Ao 2 chưa có vụ
  const pondService = require("../app/services/pond.service");
  const cropService = require("../app/services/crop.service");
  const weighSessionService = require("../app/services/weighSession.service");
  const ao1 = await pondService.createPond({ pondName: "Ao 1", area: 1000 });
  await new Promise((resolve) => setTimeout(resolve, 5));
  await pondService.createPond({ pondName: "Ao 2" });
  const crop = await cropService.createCrop({ pondId: ao1.data._id });
  const session = await weighSessionService.getOrCreateOpenSession();
  await weighSessionService.updateSessionCrop(session._id, crop.data._id);
};

const main = async () => {
  const { MongoMemoryServer } = require("mongodb-memory-server");

  process.env.JWT_SECRET = "dev-local-secret-chi-dung-tren-may-0123456789";
  process.env.APP_PASSWORD_HASH = bcrypt.hashSync(DEV_PASSWORD, 8);
  const port = process.env.NODE_PORT || 3000;

  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await seedDemoData();

  const app = require("../app");
  app.listen(port, () => {
    console.log(`BE local (DB tạm trong bộ nhớ) chạy ở http://localhost:${port}/api`);
    console.log(`Mật khẩu đăng nhập: ${DEV_PASSWORD}`);
  });

  const stop = async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { seedDemoData, DEV_PASSWORD };
