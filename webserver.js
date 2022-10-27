module.exports = data => {
    const express = require('express');
    require('dotenv').config();
    
    const port = process.env.WEBSERVER_PORT;
    const app = express();
    
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    
    app.get('/', (req, res) => {
        res.sendFile(`${__dirname}/web/index.html`);
    });
    
    app.get('/data', (req, res) => {
        res.send(data);
    });

    app.use(express.static(`${__dirname}/web/`));
    
    app.listen(port, () => {
        console.log(`WebServer started.\nCheck your trades on http://localhost:${port}`);
    });
}