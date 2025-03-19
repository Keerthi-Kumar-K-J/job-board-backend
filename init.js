const sequelize = require("./models/index");
const Job = require("./models/Job");

const initDB = async () => {
  await sequelize.sync({ force: true }); // Set `force: false` to keep data
  console.log("Database synced!");
};

initDB();
