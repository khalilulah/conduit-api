require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3000;
// console.log("DATABASE_URL:", process.env.DATABASE_URL);
app.listen(PORT, () => {
  console.log(`Conduit API running on port ${PORT}`);
});
