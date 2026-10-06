"""Mocked HTTP-body accounting, not a promise about vendor billing or providers."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from app.platforms.egress import MetadataTransport, ProxyMetrics, bandwidth_projection


def main():
    rows = []
    for size in (10 * 1024, 20 * 1024, 50 * 1024, 100 * 1024):
        metrics = ProxyMetrics()
        transport = httpx.MockTransport(lambda request: httpx.Response(200,
            headers={'content-type': 'application/json'}, stream=httpx.ByteStream(b'{}' + b' ' * (size - 2))))
        with MetadataTransport('http://mock.invalid', metrics, transport=transport) as client:
            client.request('https://www.reddit.com/comments/example.json').read()
        rows.append({'averageMeasuredBodyBytesPerResolution': metrics.report()['proxyTotalBytes'],
                     'requests': metrics.proxyRequestCount,
                     'approximateResolutionsPerGiB': bandwidth_projection(metrics.report()['proxyTotalBytes'])})
    print(json.dumps({'mocked': True, 'scope': 'Application body bytes; framing, headers, TLS, TCP and vendor overhead excluded', 'examples': rows}, indent=2))


if __name__ == '__main__':
    main()
