"""
Baixa o roadNet-CA (SNAP) para data/dataset_parte2/roadNet-CA.txt.gz
Uso: python scripts/download_roadnet_ca.py
"""
from __future__ import annotations

import urllib.request
from pathlib import Path

URL = "https://snap.stanford.edu/data/roadNet-CA.txt.gz"


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out = root / "data" / "dataset_parte2" / "roadNet-CA.txt.gz"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        print(f"Já existe: {out}")
        return
    print(f"Baixando {URL} ...")
    urllib.request.urlretrieve(URL, out)
    print(f"Salvo em {out}")


if __name__ == "__main__":
    main()
