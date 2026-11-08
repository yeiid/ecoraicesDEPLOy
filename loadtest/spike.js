import http from 'k6/http';
import { check, sleep } from 'k6';

const SYNC = __ENV.SYNC_URL || 'http://localhost:48085';
const API = __ENV.API_URL || 'http://localhost:48000';

// Spike: pico abrupto de tráfico
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '10s', target: 150 }, // spike
    { duration: '30s', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: { http_req_failed: ['rate<0.05'] },
};

export default function () {
  const r = http.get(`${API}/api/species`);
  check(r, { ok: (x) => x.status === 200 });
  sleep(0.1);
}
