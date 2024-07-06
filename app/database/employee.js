const mysql = require("mysql2");
const dbConfig = require("../configs/db.config");

const connection = mysql.createConnection({
  host: dbConfig.MYSQL_HOST,
  user: dbConfig.MYSQL_USER,
  password: dbConfig.MYSQL_PASSWORD,
  database: dbConfig.MYSQL_DATABASE,
});
console.error("Lỗi kết nối:", process.env);
getAllEmployee = () => {
  connection.connect((err) => {
    if (err) {
      console.error("Lỗi kết nối:", err.stack);
      return;
    }
    console.log("Kết nối thành công với MySQL");
  });

  connection.query(
    "SELECT * FROM employee",
    (error, results, fields) => {
      if (error) throw error;

      // Xử lý kết quả truy vấn
      console.log("Dữ liệu từ cơ sở dữ liệu:", results);

      // Đóng kết nối sau khi hoàn thành truy vấn
      connection.end((err) => {
        if (err) {
          console.error("Lỗi đóng kết nối:", err.stack);
          return;
        }
        console.log("Đã đóng kết nối với MySQL");
      });
    }
  );
};

module.exports = {
  getAllEmployee,
};
