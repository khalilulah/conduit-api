const db = require("../../db");

const getAllTags = async () => {
  const { rows } = await db.query(`SELECT name FROM tags ORDER BY name ASC`);
  return rows.map((r) => r.name);
};

module.exports = { getAllTags };
