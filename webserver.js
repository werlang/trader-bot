const express = require('express');
require('dotenv').config();

const port = process.env.WEBSERVER_PORT;
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/web/index.html`);
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});