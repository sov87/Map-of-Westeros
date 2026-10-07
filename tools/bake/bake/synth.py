"""Phase 1: the synthesized elevation model (filled in by the Phase 1 toolchain)."""
from __future__ import annotations

from .config import Config


def synthesize(cfg: Config):
    raise SystemExit("source.kind 'synth' needs the Phase 1 terrain synthesis (tools/bake/bake/synth.py)")
