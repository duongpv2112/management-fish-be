const { toDateOnly, formatMonthYear } = require("../app/common/dateOnly");

test("chuỗi YYYY-MM-DD → 00:00 UTC của ngày đó", () => {
  expect(toDateOnly("2026-09-27").toISOString()).toBe("2026-09-27T00:00:00.000Z");
});

test.each(["2026-02-30", "abc", "27/09/2026", 123])("%j không hợp lệ → null", (value) => {
  expect(toDateOnly(value)).toBeNull();
});

test("Date → ngày lịch Việt Nam của thời điểm đó", () => {
  // 20:00 UTC ngày 27 là 03:00 ngày 28 ở Việt Nam
  expect(toDateOnly(new Date("2026-09-27T20:00:00Z")).toISOString()).toBe("2026-09-28T00:00:00.000Z");
});

test("bỏ trống → hôm nay theo giờ Việt Nam", () => {
  const today = toDateOnly();
  expect(today.toISOString()).toBe(toDateOnly(new Date()).toISOString());
  expect(toDateOnly("").toISOString()).toBe(today.toISOString());
  expect(toDateOnly(null).toISOString()).toBe(today.toISOString());
});

test("formatMonthYear", () => {
  expect(formatMonthYear(toDateOnly("2026-03-05"))).toBe("03/2026");
});
