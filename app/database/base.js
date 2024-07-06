const mysql = require("mysql2");
const dbConfig = require("../configs/db.config");

class BaseDbConnect {
  constructor() {
    this.connection = mysql.createConnection({
      host: dbConfig.MYSQL_HOST,
      user: dbConfig.MYSQL_USER,
      password: dbConfig.MYSQL_PASSWORD,
      database: dbConfig.MYSQL_DATABASE,
    });
  }

  // startConnectDb = () => {
  //   this.connection.connect((err) => {
  //     if (err) {
  //       console.error("Lỗi kết nối:", err.stack);
  //       return;
  //     }
  //     console.log("Kết nối thành công với MySQL");
  //   });
  // };

  // endConnectDb = () => {
  //   this.connection.end((err) => {
  //     if (err) {
  //       console.error("Lỗi đóng kết nối:", err.stack);
  //       return;
  //     }
  //     console.log("Đã đóng kết nối với MySQL");
  //   });
  // };

  // queryDb = () => {
  //   return this.connection.query(
  //     "SELECT * FROM your_table",
  //     (error, results, fields) => {
  //       if (error) throw error;
  //       console.log("Kết quả truy vấn:", results);
  //     }
  //   );
  // };
}

export default BaseDbConnect;
