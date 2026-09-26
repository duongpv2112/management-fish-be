// Gán các lần cân cũ (chưa có phiên) vào phiên đã đóng "Dữ liệu cũ" và tính trọng lượng thực
// theo trọng lượng giỏ hiện tại. Chạy lại nhiều lần vẫn cho cùng kết quả.
//   npm run migrate:sessions -- --dry-run   # chỉ in thống kê
//   npm run migrate:sessions
const FishWeight = require("../app/models/fishWeight");
const BasketType = require("../app/models/basketType");
const WeighSession = require("../app/models/weighSession");

const LEGACY_SESSION_NAME = "Dữ liệu cũ";

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * @param {{ dryRun: boolean }} options
 * @returns {Promise<{ sessionCreated: boolean, updated: number }>}
 */
const migrateSessions = async ({ dryRun }) => {
  const legacyWeights = await FishWeight.find({ session: { $exists: false } });
  let session = await WeighSession.findOne({ sessionName: LEGACY_SESSION_NAME });
  const sessionCreated = !session && legacyWeights.length > 0;

  const basketWeights = new Map(
    (await BasketType.find()).map((basket) => [basket._id, basket.basketWeight])
  );
  const plans = legacyWeights.map((weight) => {
    const snapshot = basketWeights.get(weight.basketType) ?? 0;
    return {
      _id: weight._id,
      basketWeightSnapshot: snapshot,
      netWeight: round2(weight.fishWeight - snapshot),
    };
  });

  console.log(`Số lần cân chưa có phiên: ${plans.length}`);
  console.log(sessionCreated ? `Sẽ tạo phiên "${LEGACY_SESSION_NAME}"` : `Phiên "${LEGACY_SESSION_NAME}" đã có hoặc không cần tạo`);
  const nonPositive = plans.filter((plan) => plan.netWeight <= 0);
  if (nonPositive.length > 0) {
    console.log(
      `Có ${nonPositive.length} lần cân có trọng lượng thực <= 0, hãy kiểm tra: ${nonPositive
        .map((plan) => plan._id)
        .join(", ")}`
    );
  }

  if (dryRun || plans.length === 0) {
    return { sessionCreated, updated: plans.length };
  }

  if (!session) {
    session = await WeighSession.create({
      sessionName: LEGACY_SESSION_NAME,
      status: "closed",
      closedAt: new Date(),
      note: "Các lần cân trước khi có tính năng phiên cân",
    });
  }

  const result = await FishWeight.bulkWrite(
    plans.map((plan) => ({
      updateOne: {
        // Điều kiện session chưa có để chạy song song/chạy lại không ghi đè
        filter: { _id: plan._id, session: { $exists: false } },
        update: {
          $set: {
            session: session._id,
            basketWeightSnapshot: plan.basketWeightSnapshot,
            netWeight: plan.netWeight,
          },
        },
      },
    }))
  );

  console.log(`Đã cập nhật ${result.modifiedCount} lần cân vào phiên "${LEGACY_SESSION_NAME}".`);
  return { sessionCreated, updated: result.modifiedCount };
};

if (require.main === module) {
  require("dotenv").config();
  const mongoose = require("mongoose");
  const { buildDbURI } = require("../app/config/database");
  const dryRun = process.argv.includes("--dry-run");

  mongoose
    .connect(buildDbURI())
    .then(() => migrateSessions({ dryRun }))
    .then(() => mongoose.disconnect())
    .catch(async (error) => {
      console.error("Migration thất bại:", error);
      await mongoose.disconnect();
      process.exit(1);
    });
}

module.exports = { migrateSessions };
