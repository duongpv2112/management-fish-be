const request = require("supertest");
const app = require("../app");

test("GET getFishTypes trả envelope rỗng khi DB trống", async () => {
  const res = await request(app).get("/api/fish-types/getFishTypes");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ success: true, data: [], message: expect.any(String) });
});
