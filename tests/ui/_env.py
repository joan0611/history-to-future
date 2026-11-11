"""테스트 공용 경로 — 어느 컴퓨터·CI에서도 같은 스크립트가 돌도록."""
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SEED = os.path.join(ROOT, "data", "seed.json")
SHOTS = os.environ.get("SHOTS_DIR", os.path.join(ROOT, "tests", "shots"))
CHROME = os.environ.get("CHROME_PATH", "/usr/bin/google-chrome")
os.makedirs(SHOTS, exist_ok=True)
def shot(name):
    return os.path.join(SHOTS, name)
def url(src):
    """파일 경로든 배포 주소(https://...)든 받는다. 배포된 사이트를 그대로 검사할 때 주소를 넘기면 된다."""
    return src if src.startswith(("http://", "https://")) else "file://" + os.path.abspath(src)
