import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const SYNC = __ENV.SYNC_URL || 'http://localhost:48085';
const errors = new Counter('upload_errors');

// Endurance de disco: subir imágenes pequeñas repetidas
export const options = {
  vus: 5,
  duration: '2m',
  thresholds: { upload_errors: ['count<10'] },
};

const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export default function () {
  const bin = http.fileLoader('1x1.png');
  const res = http.post(`${SYNC}/api/sync/upload`, { file: bin }, { tags: { name: 'upload' } });
  const ok = check(res, { 'upload ok': (r) => r.status === 200 });
  if (!ok) errors.add(1);
}
