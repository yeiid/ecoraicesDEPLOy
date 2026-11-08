import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API_URL || 'http://localhost:48000';
const BASE = __ENV.BASE_URL || 'http://localhost:48080';

// Soak: carga sostenida larga para detectar memory leaks (30-60 min)
export const options = {
  stages: [
    { duration: '5m', target: 30 },
    { duration: '25m', target: 30 }, // <- ajustar duración total
    { duration: '2m', target: 0 },
  ],
  thresholds: { http_req_failed: ['rate<0.01'] },
};

export default function () {
  let r = http.get(`${BASE}/`);
  check(r, { 'home': (x) => x.status === 200 });
  r = http.get(`${API}/api/observations?limit=50`);
  check(r, { 'obs': (x) => x.status === 200 });
  sleep(0.5);
}
