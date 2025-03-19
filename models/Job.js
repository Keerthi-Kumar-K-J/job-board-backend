const { DataTypes } = require("sequelize");
const sequelize = require("./index");

const Job = sequelize.define("Job", {
  title: { type: DataTypes.STRING, allowNull: false },
  location: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
});

module.exports = Job;
