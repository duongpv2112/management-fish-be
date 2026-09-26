const FishType = require("../app/models/fishType");
const BasketType = require("../app/models/basketType");
const FishWeight = require("../app/models/fishWeight");
const WeighSession = require("../app/models/weighSession");
const { migrateSessions } = require("../scripts/migrate-sessions");

let tram;
let gio;
let legacyIds;

beforeEach(async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  tram = await FishType.create({ fishName: "Cá trắm" });
  gio = await BasketType.create({ basketName: "Giỏ to", basketWeight: 2 });
  // Bản ghi cũ: chưa có session/snapshot/netWeight
  const legacy = await FishWeight.insertMany([
    { fishType: tram._id, basketType: gio._id, fishWeight: 25.5 },
    { fishType: tram._id, fishWeight: 10 },
    { fishType: tram._id, basketType: gio._id, fishWeight: 1.5 },
  ]);
  legacyIds = legacy.map((doc) => doc._id);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("gán dữ liệu cũ vào phiên đã đóng 'Dữ liệu cũ' và tính netWeight", async () => {
  const result = await migrateSessions({ dryRun: false });
  expect(result).toEqual({ sessionCreated: true, updated: 3 });

  const session = await WeighSession.findOne({ sessionName: "Dữ liệu cũ" });
  expect(session.status).toBe("closed");

  const [first, second, third] = await Promise.all(legacyIds.map((id) => FishWeight.findById(id)));
  expect(first.session).toBe(session._id);
  expect(first.basketWeightSnapshot).toBe(2);
  expect(first.netWeight).toBe(23.5);
  expect(second.basketWeightSnapshot).toBe(0);
  expect(second.netWeight).toBe(10);
  // Không từ chối net <= 0, chỉ liệt kê để người dùng tự xem
  expect(third.netWeight).toBe(-0.5);
  expect(console.log).toHaveBeenCalledWith(expect.stringContaining(third._id));
});

test("chạy lần 2 không đổi gì", async () => {
  await migrateSessions({ dryRun: false });
  const again = await migrateSessions({ dryRun: false });
  expect(again).toEqual({ sessionCreated: false, updated: 0 });
  expect(await WeighSession.countDocuments({ sessionName: "Dữ liệu cũ" })).toBe(1);
});

test("dryRun không ghi gì", async () => {
  const result = await migrateSessions({ dryRun: true });
  expect(result).toEqual({ sessionCreated: true, updated: 3 });
  expect(await WeighSession.countDocuments()).toBe(0);
  expect(await FishWeight.countDocuments({ session: { $exists: true } })).toBe(0);
});

test("không đụng tới bản ghi đã có phiên", async () => {
  const open = await WeighSession.create({ sessionName: "Đang mở" });
  await FishWeight.create({ fishType: tram._id, fishWeight: 5, session: open._id, netWeight: 5 });
  const result = await migrateSessions({ dryRun: false });
  expect(result.updated).toBe(3);
  expect(await FishWeight.countDocuments({ session: open._id })).toBe(1);
});
