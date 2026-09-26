// Loại tiền hỗ trợ cho bảng giá phiên cân và số chữ số thập phân khi làm tròn tiền
const CURRENCIES = {
  VND: { decimals: 0 },
  USD: { decimals: 2 },
};

const DEFAULT_CURRENCY = "VND";

const isValidCurrency = (currency) => Object.prototype.hasOwnProperty.call(CURRENCIES, currency);

// Làm tròn số tiền theo loại tiền (VND: số nguyên, USD: đến cent).
// Dịch dấu phẩy bằng "e" thay vì nhân 100 để 1.255 → 1.26 (1.255 * 100 = 125.4999...);
// toFixed trước để số rất nhỏ/lớn không ở dạng "1e-7" làm hỏng chuỗi
const roundMoney = (value, currency = DEFAULT_CURRENCY) => {
  const decimals = (CURRENCIES[currency] ?? CURRENCIES[DEFAULT_CURRENCY]).decimals;
  const shifted = Math.round(Number(`${Number(value).toFixed(decimals + 6)}e${decimals}`));
  return Number(`${shifted}e-${decimals}`);
};

module.exports = { CURRENCIES, DEFAULT_CURRENCY, isValidCurrency, roundMoney };
