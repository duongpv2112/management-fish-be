const request = require("supertest");
const app = require("../app");
const FishType = require("../app/models/fishType");
const BasketType = require("../app/models/basketType");
const FishWeight = require("../app/models/fishWeight");
const WeighSession = require("../app/models/weighSession");

test("getDataFish trả fishWeightItems có _id, sắp theo createdAt, fishWeights giữ nguyên", async () => {
  const session = await WeighSession.create({ sessionName: "Đang mở" });
  const tram = await FishType.create({ fishName: "Cá trắm" });
  const gio = await BasketType.create({ basketName: "Giỏ to", basketWeight: 2 });
  const first = await FishWeight.create({ fishType: tram._id, basketType: gio._id, fishWeight: 25, session: session._id });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = await FishWeight.create({ fishType: tram._id, basketType: gio._id, fishWeight: 10.5, session: session._id });
  await FishWeight.create({ fishType: tram._id, fishWeight: 99, isDelete: true, session: session._id });

  const res = await request(app).get("/api/fish-types/getDataFish");
  const row = res.body.data[0];
  expect(row.fishWeights).toEqual([25, 10.5]);
  expect(row.fishWeightItems.map((i) => i._id)).toEqual([first._id, second._id]);
  expect(row.fishWeightItems[0]).toEqual({
    _id: first._id,
    fishWeight: 25,
    basketType: gio._id,
    createdAt: first.createdAt.toISOString(),
  });
});
