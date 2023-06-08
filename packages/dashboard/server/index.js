require('dotenv').config();
const { app } = require('./app');
const { PORT } = require('./config');

async function main() {
  app.on('error', (error) => {
    throw error;
  });  
  const server = app.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}...`);
  });
  server.keepAliveTimeout = 400000;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
