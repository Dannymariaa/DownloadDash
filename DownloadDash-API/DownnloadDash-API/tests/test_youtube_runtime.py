from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.routers import diagnostics


@pytest.mark.parametrize('info,available', [
    (None, False),
    (SimpleNamespace(supported=False, path='private-path'), False),
    (SimpleNamespace(supported=True, path='private-path'), True),
])
def test_runtime_diagnostic_uses_extractor_default_and_exposes_no_paths(info, available):
    with patch.object(diagnostics.yt_dlp, 'YoutubeDL') as ydl:
        ydl.return_value.__enter__.return_value._js_runtimes = {'deno': SimpleNamespace(info=info)}
        result = diagnostics._youtube_runtime_status()
    assert result == {'jsRuntimeAvailable': available, 'extractorVersion': '2026.8.19'}
    opts = ydl.call_args.args[0]
    assert 'extractor_args' not in opts
    assert 'js_runtimes' not in opts
