"""
Camada de saída (output) padronizada do projeto.

Centraliza a escrita dos arquivos JSON gerados pela aplicação para que todos
sigam a mesma convenção:

* um bloco ``_meta`` de proveniência no topo de cada arquivo
  (quando gerado, versão do schema, qual etapa produziu, descrição);
* listas sempre embrulhadas em um objeto ``{"_meta": ..., "<chave>": [...]}``
  para que o consumidor consiga ler os metadados sem ambiguidade;
* um ``manifest.json`` por etapa, catalogando os arquivos produzidos — pensado
  para descoberta automática por integrações futuras.

A formatação é sempre ``indent=2`` + ``ensure_ascii=False`` para manter os
acentos legíveis e o diff estável.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Versão do schema dos arquivos de saída. Incrementar quando a estrutura mudar.
SCHEMA_VERSION = "1.0"

# Identifica quem produziu o arquivo (útil em logs/integrações).
GENERATOR = "Grafo de Aeroportos do Brasil — src.cli"


def _timestamp_local_iso() -> str:
    # data/hora local (com fuso) em ISO 8601, precisão de segundos
    return (
        datetime.now(timezone.utc)
        .astimezone()
        .isoformat(timespec="seconds")
    )


def arred(valor: Any, casas: int = 6) -> Any:
    # arredonda floats para deixar o JSON legível; ignora não-numéricos
    if isinstance(valor, bool):
        return valor

    if isinstance(valor, float):
        return round(valor, casas)

    return valor


def build_meta(
    descricao: str,
    *,
    parte: str,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Monta o bloco ``_meta`` padrão de proveniência."""

    meta: Dict[str, Any] = {
        "gerado_em": _timestamp_local_iso(),
        "versao_schema": SCHEMA_VERSION,
        "gerador": GENERATOR,
        "parte": parte,
        "descricao": descricao,
    }

    if extra:
        meta.update(extra)

    return meta


def _dump(payload: Any) -> str:
    return json.dumps(payload, indent=2, ensure_ascii=False)


def write_json(
    path: str | Path,
    dados: Any,
    *,
    descricao: str,
    parte: str = "parte1",
    chave_conteudo: Optional[str] = None,
    extra_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Escreve um JSON padronizado com bloco ``_meta``.

    * ``dict``  -> ``{"_meta": {...}, **dados}``
    * ``list``  -> ``{"_meta": {...}, <chave_conteudo>: dados}``
      (se ``chave_conteudo`` não for informado, usa ``"itens"``)
    """

    meta = build_meta(descricao, parte=parte, extra=extra_meta)

    if isinstance(dados, list):
        chave = chave_conteudo or "itens"
        meta["n_itens"] = len(dados)
        payload: Dict[str, Any] = {"_meta": meta, chave: dados}

    elif isinstance(dados, dict):
        payload = {"_meta": meta, **dados}

    else:
        payload = {"_meta": meta, "valor": dados}

    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(_dump(payload), encoding="utf-8")

    return payload


def read_json_list(path: str | Path, chave_conteudo: str) -> List[Any]:
    """
    Lê uma lista de um JSON tolerando tanto o formato novo
    (``{"_meta": ..., "<chave>": [...]}``) quanto o antigo (array puro).
    """

    raw = json.loads(Path(path).read_text(encoding="utf-8"))

    if isinstance(raw, dict):
        return raw.get(chave_conteudo, [])

    return raw


def write_manifest(
    out_dir: str | Path,
    *,
    parte: str,
    titulo: str,
    arquivos: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Cria/atualiza um ``manifest.json`` catalogando os arquivos de saída de uma
    etapa. Cada item descreve um arquivo (nome, tipo, descrição e, quando faz
    sentido, o schema/colunas). O manifesto também marca se o arquivo existe e
    o seu tamanho em bytes — facilitando validação por integrações.
    """

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    enriquecidos: List[Dict[str, Any]] = []

    for item in arquivos:
        nome = item.get("arquivo", "")
        caminho = out_dir / nome

        registro = dict(item)
        registro["existe"] = caminho.exists()

        if caminho.exists():
            registro["bytes"] = caminho.stat().st_size

        enriquecidos.append(registro)

    payload = {
        "_meta": build_meta(
            f"Catálogo dos arquivos de saída — {titulo}",
            parte=parte,
            extra={"total_arquivos": len(enriquecidos)},
        ),
        "arquivos": enriquecidos,
    }

    (out_dir / "manifest.json").write_text(_dump(payload), encoding="utf-8")

    return payload
