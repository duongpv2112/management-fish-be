// Chuỗi kết nối MongoDB Atlas dựng từ biến môi trường (.env / Vercel)
const buildDbURI = () =>
  `mongodb+srv://${process.env.USER_MONGODB}:${process.env.PWD_MONGODB}@cluster0.w4zp0gf.mongodb.net/management-fish?retryWrites=true&w=majority&appName=Cluster0`;

module.exports = { buildDbURI };
