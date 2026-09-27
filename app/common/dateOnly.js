// Ngày lịch (không giờ) theo giờ Việt Nam, lưu dạng Date lúc 00:00 UTC của ngày đó.
// Server Vercel chạy UTC nên không so sánh theo giờ: kết thúc vụ cùng ngày thả phải hợp lệ.

const TIME_ZONE = "Asia/Ho_Chi_Minh";

const utcDate = (year, month, day) => new Date(Date.UTC(year, month - 1, day));

// Ngày lịch Việt Nam của một thời điểm
const vietnamDateOf = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  return utcDate(get("year"), get("month"), get("day"));
};

/**
 * @param {string|Date|null|undefined} value "YYYY-MM-DD", Date, hoặc bỏ trống (= hôm nay)
 * @returns {Date|null} null nếu không hợp lệ
 */
const toDateOnly = (value) => {
  if (value === undefined || value === null || value === "") return vietnamDateOf(new Date());
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : vietnamDateOf(value);
  if (typeof value !== "string") return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = utcDate(year, month, day);
  // Loại ngày không tồn tại như 30/02 (Date tự nhảy sang tháng sau)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
};

// "MM/yyyy" của một ngày do toDateOnly tạo
const formatMonthYear = (date) =>
  `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;

module.exports = { toDateOnly, formatMonthYear };
