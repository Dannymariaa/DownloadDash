import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const TARGET_URL = __ENV.TARGET_URL || "https://example.com/post";
const MODE = __ENV.MODE || "warm";

export const options = {
  scenarios: {
    smoke_or_sustained: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<250"],
  },
};

export default function () {
  const separator = TARGET_URL.includes("?") ? "&" : "?";
  const submittedUrl =
    MODE === "cold" ? `${TARGET_URL}${separator}dd_bust=${__VU}-${__ITER}` : TARGET_URL;
  const url = `${BASE_URL}/api/v1/extract?url=${encodeURIComponent(submittedUrl)}`;
  const response = http.get(url, {
    headers: {
      "X-Correlation-ID": `k6-${MODE}`,
    },
  });

  check(response, {
    "status is 200 or controlled rejection": (res) =>
      [200, 400, 415, 429].includes(res.status),
    "json response": (res) => String(res.headers["Content-Type"]).includes("application/json"),
  });

  sleep(Number(__ENV.SLEEP_SECONDS || 1));
}
