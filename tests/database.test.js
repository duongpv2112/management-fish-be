const { buildDbURI, requiredEnvNames } = require("../app/config/database");

test("có MONGODB_URI → dùng nguyên chuỗi đó", () => {
  const env = { MONGODB_URI: "mongodb://localhost:27017/management-fish", USER_MONGODB: "u", PWD_MONGODB: "p" };
  expect(buildDbURI(env)).toBe("mongodb://localhost:27017/management-fish");
});

test("không có MONGODB_URI → dựng chuỗi Atlas từ USER_MONGODB/PWD_MONGODB", () => {
  const uri = buildDbURI({ USER_MONGODB: "u", PWD_MONGODB: "p" });
  expect(uri.startsWith("mongodb+srv://u:p@")).toBe(true);
  expect(uri).toContain("/management-fish?");
});

test("user/mật khẩu Atlas có ký tự đặc biệt được mã hóa URL", () => {
  const uri = buildDbURI({ USER_MONGODB: "a@b", PWD_MONGODB: "p:/@#" });
  expect(uri.startsWith("mongodb+srv://a%40b:p%3A%2F%40%23@")).toBe(true);
});

test("biến bắt buộc: có MONGODB_URI thì không cần USER_MONGODB/PWD_MONGODB", () => {
  expect(requiredEnvNames({ MONGODB_URI: "mongodb://x" })).toEqual(["JWT_SECRET", "APP_PASSWORD_HASH"]);
  expect(requiredEnvNames({})).toEqual(["USER_MONGODB", "PWD_MONGODB", "JWT_SECRET", "APP_PASSWORD_HASH"]);
});
