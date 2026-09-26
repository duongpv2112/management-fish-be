const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const FishType = require("../app/models/fishType");
const FishWeight = require("../app/models/fishWeight");
const WeighSession = require("../app/models/weighSession");

let tram;
let me;
let chep;
let session;
let otherSession;

const addWeight = (fishType, net, sessionId, extra = {}) =>
  FishWeight.create({
    fishType: fishType._id,
    fishWeight: net + 2,
    basketWeightSnapshot: 2,
    netWeight: net,
    session: sessionId,
    ...extra,
  });

beforeEach(async () => {
  tram = await FishType.create({ fishName: "Cá trắm" });
  me = await FishType.create({ fishName: "Cá mè" });
  chep = await FishType.create({ fishName: "Cá chép" });
  otherSession = await WeighSession.create({ sessionName: "Hôm qua", status: "closed" });
  session = await WeighSession.create({
    sessionName: "Hôm nay",
    buyerName: "Anh Tuấn",
    prices: [{ fishType: tram._id, unitPrice: 45000 }],
  });
  await addWeight(tram, 23.5, session._id);
  await addWeight(tram, 30.25, session._id);
  await addWeight(me, 10, session._id);
  await addWeight(me, 99, session._id, { isDelete: true });
  await addWeight(chep, 7, otherSession._id);
});

describe("getSessionSummary", () => {
  test("tổng hợp theo loại cá, thiếu giá thì amount null", async () => {
    const res = await request(app).get(`/api/weigh-sessions/getSessionSummary/${session._id}`).set(authHeader());
    expect(res.body.success).toBe(true);
    const { session: info, lines, totalNet, totalAmount, missingPriceCount } = res.body.data;

    expect(info).toMatchObject({ _id: session._id, sessionName: "Hôm nay", buyerName: "Anh Tuấn", status: "open" });
    // Chỉ loại cá có lần cân trong phiên, sắp theo tên
    expect(lines.map((l) => l.fishName)).toEqual(["Cá mè", "Cá trắm"]);
    const [meLine, tramLine] = lines;
    expect(tramLine).toEqual({
      fishTypeId: tram._id,
      fishName: "Cá trắm",
      count: 2,
      totalGross: 57.75,
      totalNet: 53.75,
      unitPrice: 45000,
      amount: 2418750,
    });
    expect(meLine).toMatchObject({ count: 1, totalNet: 10, unitPrice: null, amount: null });
    expect(totalNet).toBe(63.75);
    expect(totalAmount).toBe(2418750);
    expect(missingPriceCount).toBe(1);
  });

  test("phiên không tồn tại", async () => {
    const res = await request(app).get("/api/weigh-sessions/getSessionSummary/khong-co").set(authHeader());
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Không tìm thấy phiên cân!");
  });
});

describe("getDataFish theo phiên", () => {
  test("sessionId → chỉ lần cân của phiên đó, fishWeightItems có netWeight", async () => {
    const res = await request(app).get(`/api/fish-types/getDataFish?sessionId=${otherSession._id}`).set(authHeader());
    const byName = Object.fromEntries(res.body.data.map((row) => [row.fishName, row]));
    expect(byName["Cá chép"].fishWeights).toEqual([9]);
    expect(byName["Cá chép"].fishWeightItems[0].netWeight).toBe(7);
    expect(byName["Cá trắm"].fishWeights).toEqual([]);
  });

  test("không truyền sessionId → phiên đang mở", async () => {
    const res = await request(app).get("/api/fish-types/getDataFish").set(authHeader());
    const byName = Object.fromEntries(res.body.data.map((row) => [row.fishName, row]));
    expect(byName["Cá trắm"].fishWeights).toEqual([25.5, 32.25]);
    expect(byName["Cá chép"].fishWeights).toEqual([]);
  });

  test("không có phiên mở → danh sách cân rỗng nhưng vẫn có loại cá", async () => {
    await WeighSession.updateOne({ _id: session._id }, { status: "closed" });
    const res = await request(app).get("/api/fish-types/getDataFish").set(authHeader());
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.every((row) => row.fishWeights.length === 0)).toBe(true);
  });
});
