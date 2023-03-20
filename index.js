const express = require("express");
const app = express();
const calculate = require("./api/calculate");
console.log("index");
app.use(express.json({ extended: false }));

app.use("/api/calculate", calculate);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running in port ${PORT}`));
module.exports = app;