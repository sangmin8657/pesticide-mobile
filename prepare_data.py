import io
import json
import math
import os
import pandas as pd
import requests

DATA_URL = "https://github.com/sangmin8657/pesticide-app/releases/download/pesticide/pesticide_data.csv"
NIER_LOGO_URL = "https://github.com/sangmin8657/pesticide-app/releases/download/pesticide/nier_logo.png"
RDA_LOGO_URL = "https://github.com/sangmin8657/pesticide-app/releases/download/pesticide/rda_logo.png"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

CHUNK_SIZE = 20000  # 파일당 2만 건씩 분할 (Cloudflare 25MB 제한 방지)

os.makedirs("assets", exist_ok=True)


def download_logo(url: str, save_path: str) -> None:
    try:
        res = requests.get(url, headers=HEADERS, timeout=15)
        res.raise_for_status()
        with open(save_path, "wb") as f:
            f.write(res.content)
        print(f"로고 저장 완료: {save_path}")
    except Exception as e:
        print(f"로고 다운로드 건너뜀 ({save_path}): {e}")


def build_json_data() -> None:
    res = requests.get(DATA_URL, headers=HEADERS, timeout=30)
    res.raise_for_status()
    df = pd.read_csv(io.StringIO(res.text), dtype=str)
    df.columns = df.columns.str.strip()
    df = df.fillna("-")

    columns = df.columns.tolist()
    records = df.values.tolist()
    total_rows = len(records)
    num_chunks = max(1, math.ceil(total_rows / CHUNK_SIZE))

    chunk_files = []
    for i in range(num_chunks):
        chunk = records[i * CHUNK_SIZE : (i + 1) * CHUNK_SIZE]
        filename = f"pesticide_part_{i}.json"
        filepath = os.path.join("assets", filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(chunk, f, ensure_ascii=False, separators=(",", ":"))
        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        print(f"분할 파일 생성: {filename} ({len(chunk):,}건, {size_mb:.2f} MB)")
        chunk_files.append(filename)

    meta = {
        "columns": columns,
        "chunks": chunk_files,
        "total": total_rows,
    }
    with open("assets/pesticide_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))

    print(f"농약 데이터 변환 완료: 총 {total_rows:,}건 ({num_chunks}개 파일로 분할)")


if __name__ == "__main__":
    download_logo(NIER_LOGO_URL, "assets/nier_logo.png")
    download_logo(RDA_LOGO_URL, "assets/rda_logo.png")
    build_json_data()
