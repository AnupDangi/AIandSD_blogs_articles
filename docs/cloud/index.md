# Roadmap 1 — Senior Cloud Production Engineering

Source: `Senior_Cloud_Production_Engineering_Field_Manual.pdf` · 38 pages · 19 sections · 5 projects · ~12 weeks.

!!! info "How to use this track"
    Follow sections 1→19 in order. Each future lesson page = one section with diagram, mechanics, failure drill, lab, checkpoint, sources.

## Roadmap

| # | Section | What you learn | Lab / proof |
|---|---------|----------------|-------------|
| 1 | Plan: learn like a senior | 12-week table, 5 habits, 8 workload questions | Write your workload answers |
| 2 | Universal cloud mental model | Edge/entry/compute/state/cache/messaging/identity; control vs data plane; ownership map | Draw control/data-plane split |
| 3 | One app on VPS, done properly | iLovePDF-style: Cloudflare → Caddy → Compose + managed Postgres + S3 presigned uploads | Reproducible SaaS on 1 VM |
| 4 | IaC: Terraform/CloudFormation/Ansible/images | State blast radius, plan/apply discipline, drift/import, golden AMI | Remote state + OIDC CI |
| 5 | Modular monolith → microservices | 6 extraction reasons; polyglot TS/Go/Python/Rust | Justify staying monolith |
| 6 | Kubernetes without mythology | Gives/doesn't-give; readiness vs liveness vs startup probes | kind/k3d probe lab |
| 7 | Production delivery | CI/CD chain trust, expand-contract migrations, progressive delivery | Same-digest promote + rollback |
| 8 | Observability + SRE | OTel traces/metrics/logs, RED/USE, SLO + error budgets | RED dashboard + alert |
| 9 | Security + supply chain | 12-point baseline, WAF, SBOM/signing, rate-limit tiers | Least-privilege review |
| 10 | Replit/E2B-style runtime cloud | Scheduler vs microVM data plane, Firecracker, snapshots | Mini sandbox scheduler |
| 11 | ChatGPT-style execution planes | Product/API, model gateway, durable agents, coding sandbox, browser-use | Plane separation ADR |
| 12 | Multi-cloud / multi-region | AZ → backup → region → selective multi-provider; RTO/RPO | DR plan, no vague HA |
| 13 | Canary vs blue/green vs A/B | Guardrail metrics, sticky flags, A/A validation | 5→25→50→100 rollout |
| 14 | Nested control loops | Terraform → runtime → capacity → app → reliability; ms→weeks | Map your loops |
| 15 | Senior decision framework (ADR) | Workload/state/reliability/security/cost checklists | 2-page ADR |
| 16 | Common mistakes → senior response | 10-row table (microservices-by-default, K8s=prod…) | Spot your anti-pattern |
| 17 | Five projects | P1 SaaS VM · P2 event-driven AI platform · P3 K8s+GitOps · P4 sandbox runtime · P5 multi-region SRE capstone | Portfolio proofs |
| 18 | Tool map + official links | AWS/GCP/Azure, Terraform, K8s, ArgoCD, OTel/Prometheus | Reading backlog |
| 19 | Final memory sheet | WORKLOAD·STATE·BOUNDARIES·FAILURE·OWNERSHIP·FEEDBACK·COST·SIMPLICITY | 1-page recall |

*Lessons expand section-by-section in Phase 1+. This index is the contract.*
