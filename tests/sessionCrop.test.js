const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const Pond = require("../app/models/pond");
const Crop = require("../app/models/crop");
const WeighSession = require("../app/models/weighSession");
const LogTracking = require("../app/models/logTracking");
const weighSessionService = require("../app/services/weighSession.service");

const base = "/api/weigh-sessions";
const createSession = (body) => request(app).post(`${base}/createWeighSessions`).set(authHeader()).send(body);
const updateSessionCrop = (id, body) =>
  request(app).put(`${base}/updateSessionCrop/${id}`).set(authHeader()).send(body);
const listSessions = () => request(app).get(`${base}/getWeighSessions`).set(authHeader());

let ao1;
let openCrop;
let closedCrop;

beforeEach(async () => {
  ao1 = await Pond.create({ pondName: "Ao 1" });
  openCrop = await Crop.create({ pond: ao1._id, cropName: "Vụ mở", startDate: new Date("2026-06-01") });
  closedCrop = await Crop.create({
    pond: ao1._id,
    cropName: "Vụ cũ",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-05-01"),
    status: "closed",
  });
});

test("tạo phiên với vụ đang mở", async () => {
  const res = await createSession({ buyerName: "Anh Tuấn", cropId: openCrop._id });
  expect(res.body.success).toBe(true);
  expect(res.body.data.crop).toBe(openCrop._id);

  const list = await listSessions();
  expect(list.body.data[0].crop.cropName).toBe("Vụ mở");
  expect(list.body.data[0].crop.status).toBe("open");
  expect(list.body.data[0].crop.pond.pondName).toBe("Ao 1");
});

test.each(["", null, undefined])("cropId %j → phiên không gán vụ", async (cropId) => {
  const res = await createSession({ cropId });
  expect(res.body.success).toBe(true);
  expect(res.body.data.crop).toBeNull();
});

test("vụ đã kết thúc / không tồn tại → từ chối, không đóng phiên đang mở", async () => {
  const current = await WeighSession.create({ sessionName: "Đang mở" });

  let res = await createSession({ cropId: closedCrop._id });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Vụ đã kết thúc, hãy chọn vụ đang nuôi!");

  res = await createSession({ cropId: "khong-co" });
  expect(res.body.message).toBe("Không tìm thấy dữ liệu!");

  expect(await WeighSession.countDocuments()).toBe(1);
  expect((await WeighSession.findById(current._id)).status).toBe("open");
});

test("phiên tự tạo khi cân không có vụ", async () => {
  const session = await weighSessionService.getOrCreateOpenSession();
  expect(session.crop).toBeNull();
});

test("gán / đổi / bỏ gán vụ", async () => {
  const session = await WeighSession.create({ sessionName: "P", status: "closed" });

  let res = await updateSessionCrop(session._id, { cropId: closedCrop._id });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Cập nhật ao cho phiên thành công!");
  expect((await WeighSession.findById(session._id)).crop).toBe(closedCrop._id);

  res = await updateSessionCrop(session._id, { cropId: openCrop._id });
  expect((await WeighSession.findById(session._id)).crop).toBe(openCrop._id);

  res = await updateSessionCrop(session._id, { cropId: null });
  expect(res.body.success).toBe(true);
  expect((await WeighSession.findById(session._id)).crop).toBeNull();

  expect(await LogTracking.countDocuments({ stepName: /Gán ao cho phiên/ })).toBe(3);
});

test("gán vụ: phiên hoặc vụ không tồn tại", async () => {
  const session = await WeighSession.create({ sessionName: "P" });
  expect((await updateSessionCrop("khong-co", { cropId: openCrop._id })).body.message).toBe("Không tìm thấy dữ liệu!");
  expect((await updateSessionCrop(session._id, { cropId: "khong-co" })).body.message).toBe("Không tìm thấy dữ liệu!");
});

test("ao đã xóa mềm vẫn hiện tên ở phiên cũ", async () => {
  await WeighSession.create({ sessionName: "P", status: "closed", crop: closedCrop._id });
  await Crop.updateOne({ _id: openCrop._id }, { status: "closed", endDate: new Date("2026-09-01") });
  await Pond.updateOne({ _id: ao1._id }, { isDelete: true });

  const list = await listSessions();
  expect(list.body.data[0].crop.pond.pondName).toBe("Ao 1");
});

test("getOpenWeighSession có crop.pond", async () => {
  await WeighSession.create({ sessionName: "P", crop: openCrop._id });
  const res = await request(app).get(`${base}/getOpenWeighSession`).set(authHeader());
  expect(res.body.data.crop.pond.pondName).toBe("Ao 1");
});
