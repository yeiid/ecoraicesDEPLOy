const fs = require('fs');
const files = ['/tmp/ecoraices-debug/docker-compose.dokploy.yml', '/tmp/ecoraices-debug/docker-compose.yml'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('BACKEND_URL:')) {
    content = content.replace(/DATABASE_URL:/, 'BACKEND_URL: ${BACKEND_URL:-http://backend:8000}\n      DATABASE_URL:');
    fs.writeFileSync(file, content);
  }
}
