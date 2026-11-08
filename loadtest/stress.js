import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:48080';
const API = __ENV.API_URL || 'http://localhost:48000';
const SYNC = __ENV.SYNC_URL || 'http://localhost:48085';

export const options = {
  // Stress: ramp lineal hasta el punto de quiebre
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const r = http.get(`${API}/api/observations?limit=50`);
  check(r, { 'obs 200': (x) => x.status === 200 });
  const h = http.get(`${SYNC}/api/sync/health`);
  check(h, { 'sync health': (x) => x.status === 200 });
}
