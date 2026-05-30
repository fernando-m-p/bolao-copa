const { createApp } = require('./lib/app-express');

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server rodando em http://localhost:${port}`);
});

module.exports = app;
