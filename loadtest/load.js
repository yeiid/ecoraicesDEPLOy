import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:48080';
const API = __ENV.API_URL || 'http://localhost:48000';

export const thresholds = {
  http_req_duration: ['p(95)<800'],
  http_req_failed: ['rate<0.01'],
};

export default function () {
  // Flujo principal: home SSR + listados API
  let r = http.get(`${BASE}/`);
  check(r, { 'home 200': (x) => x.status === 200 });

  r = http.get(`${API}/api/species`);
  check(r, { 'species 200': (x) => x.status === 200 });

  r = http.get(`${API}/api/observations?limit=50`);
  check(r, { 'observations 200': (x) => x.status === 200 });

  r = http.get(`${API}/api/stats/`);
  check(r, { 'stats 200': (x) => x.status === 200 });

  r = http.get(`${API}/api/communities`);
  check(r, { 'communities 200': (x) => x.status === 200 });

  sleep(0.2);
}
