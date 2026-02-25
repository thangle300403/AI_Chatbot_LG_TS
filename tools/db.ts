import mysql from "mysql2/promise";

export const db = await mysql.createPool({
  host: "localhost",
  user: "billie",
  password: "",
  database: "bill",
  waitForConnections: true,
  connectionLimit: 10,
});

export const db2 = await mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "bill",
  waitForConnections: true,
  connectionLimit: 10,
});
