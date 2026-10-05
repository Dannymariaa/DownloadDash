import sys
from pathlib import Path

import pytest

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))


@pytest.fixture(autouse=True)
def isolated_resolved_media_cache(monkeypatch, tmp_path):
    from app.platforms import public_platforms
    from app.state import public_downloader
    monkeypatch.setattr(public_platforms, 'RESOLVED_MEDIA_DIRECTORY', tmp_path / 'resolved')
    monkeypatch.setattr(public_downloader, '_resolved_dir', tmp_path / 'resolved')
