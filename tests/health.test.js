const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");

test("GET getFishTypes trả envelope rỗng khi DB trống", async () => {
  const res = await request(app).get("/api/fish-types/getFishTypes").set(authHeader());
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ success: true, data: [], message: expect.any(String) });
});
