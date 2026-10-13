# Learn Cloud, System Design & Applied AI — Guided, In Order

Four roadmaps. One page per PDF unit. Each lesson: why it exists → diagram → mechanics → failure drill → lab → checkpoint → sources.

!!! tip "Start here"
    New to all three? Do the **60-Day Sprint** first for breadth, then go deep in each track.

## The 4 roadmaps

| # | Roadmap | Source PDF | Units | Time | Outcome |
|---|---------|------------|-------|------|---------|
| 1 | [Senior Cloud Production Engineering](cloud/index.md) | `Senior_Cloud_Production_Engineering_Field_Manual.pdf` | 19 sections + 5 projects | ~12 weeks | Ship + operate prod cloud (VPS → K8s → multi-region) |
| 2 | [Practical System Design](system-design/index.md) | `Practical_System_Design_Anup_Dangi.pdf` | 52 chapters + 5 projects | ~10–12 weeks | Design + defend web-scale systems in interviews and prod |
| 3 | [Practical Applied AI Engineering](applied-ai/index.md) | `Practical_AI_Engineering_Anup_Dangi.pdf` | 40 chapters + 5 projects | ~8–10 weeks | Build + evaluate + ship reliable LLM apps and agents |
| 4 | [60-Day AI + System Design Sprint](60-day/index.md) | `60_Days_AI_Engineering_System_Design_Roadmap_Anup_Dangi.pdf` | 60 days × 2 cards (AI + SD) | 60 days | Daily paired reps: one AI card + one SD card with readings |

## How each lesson page works (locked template)

1. **Why this exists** + simplified architecture diagram (Mermaid redraw, no copied screenshots)
2. **Three concepts to retain**
3. **Mechanics + worked example** (numbers: latency budgets, KV memory, Little's law, recall@k)
4. **Failure drill** — what fails first, symptom, amplification, telemetry proof, degrade path
5. **DO THIS lab** — hands-on from the PDF (curl, dig, tokenizer, FAISS, router, canary…)
6. **Mid-senior checkpoint** — one interview-style question
7. **Sources** — Required reading + Official/Deep reference, clickable, per lesson
8. **Recall checklist** — redraw from memory before rereading

## Sources & citations policy

- Each lesson links its **primary docs / papers / eng blogs** (MDN, Cloudflare, AWS Builders, Anthropic/OpenAI engineering, Chip Huyen, arXiv).
- Company architectures redrawn as teaching diagrams with data/control/state/failure boundaries labeled.
- Corrections: open a GitHub Issue — every lesson footer links the repo.

---
*Phase 0: scaffold + roadmap indexes live. Lessons expand PDF-by-PDF next.*
