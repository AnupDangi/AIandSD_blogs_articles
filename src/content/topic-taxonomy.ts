export type CanonicalTopic = {
  topicId: string;
  label: string;
  summary: string;
  format: "topic";
};

export const taxonomy = [
  {
    topicId: "topic-decoding-control",
    label: "Tokens, decoding, and typed outputs",
    summary: "Tokenization, generation control, attention mechanics, typed model boundaries, and prompt changes evaluated by task slice.",
    format: "topic",
  },
  {
    topicId: "topic-retrieval-evaluation",
    label: "Retrieval and its evaluation",
    summary: "Embeddings, vector and hybrid search, chunking, reranking, production RAG architecture, and measuring retrieval quality separately from generation.",
    format: "topic",
  },
  {
    topicId: "topic-agent-reliability",
    label: "Agent workflows and durable state",
    summary: "Bounded loops, tool interfaces, planning, context and memory, multi-agent coordination, checkpoints, and resumable long-running runs.",
    format: "topic",
  },
  {
    topicId: "topic-evaluation-judges",
    label: "Evaluation datasets and judges",
    summary: "Failure taxonomies, representative evaluation slices, calibrated LLM judges, and trajectory evaluation for agent runs.",
    format: "topic",
  },
  {
    topicId: "topic-cost-efficiency",
    label: "Cost and efficiency engineering",
    summary: "Model selection, routing, and cascades; cost per successful task; and caching repeated prompt prefixes under realistic traffic.",
    format: "topic",
  },
  {
    topicId: "topic-serving-reliability",
    label: "Latency, fallback, and release reliability",
    summary: "KV-cache and batching capacity, critical-path latency, retries and graceful degradation, provider failures, and canary release gates.",
    format: "topic",
  },
  {
    topicId: "topic-trust-safety",
    label: "Trust, safety, and evidence",
    summary: "Sandboxing and containment, approval for consequential actions, prompt-injection defense, and evidence-bearing claims a reviewer can check.",
    format: "topic",
  },
  {
    topicId: "topic-observability",
    label: "Observability and SLOs",
    summary: "Tracing model, retrieval, and tool spans to reconstruct a run, plus service objectives and enforced time, cost, and step budgets.",
    format: "topic",
  },
  {
    topicId: "topic-production-operations",
    label: "Production operations and readiness",
    summary: "Treating AI systems as products, bounded repair loops, launch readiness reviews, and an integrated production architecture.",
    format: "topic",
  },
] as const satisfies readonly CanonicalTopic[];

export type CanonicalTopicId = (typeof taxonomy)[number]["topicId"];

export const canonicalTopicIds = taxonomy.map((topic) => topic.topicId) as CanonicalTopicId[];

export const lessonCanonicalTopicIds: Record<string, CanonicalTopicId> = {
  "ai-01": "topic-production-operations",
  "ai-02": "topic-decoding-control",
  "ai-03": "topic-decoding-control",
  "ai-04": "topic-serving-reliability",
  "ai-05": "topic-decoding-control",
  "ai-06": "topic-decoding-control",
  "ai-07": "topic-cost-efficiency",
  "ai-08": "topic-retrieval-evaluation",
  "ai-09": "topic-retrieval-evaluation",
  "ai-10": "topic-retrieval-evaluation",
  "ai-11": "topic-retrieval-evaluation",
  "ai-12": "topic-retrieval-evaluation",
  "ai-13": "topic-retrieval-evaluation",
  "ai-14": "topic-retrieval-evaluation",
  "ai-15": "topic-agent-reliability",
  "ai-16": "topic-agent-reliability",
  "ai-17": "topic-agent-reliability",
  "ai-18": "topic-agent-reliability",
  "ai-19": "topic-agent-reliability",
  "ai-20": "topic-agent-reliability",
  "ai-21": "topic-agent-reliability",
  "ai-22": "topic-evaluation-judges",
  "ai-23": "topic-evaluation-judges",
  "ai-24": "topic-evaluation-judges",
  "ai-25": "topic-observability",
  "ai-26": "topic-cost-efficiency",
  "ai-27": "topic-serving-reliability",
  "ai-28": "topic-observability",
  "ai-29": "topic-serving-reliability",
  "ai-30": "topic-serving-reliability",
  "ai-31": "topic-trust-safety",
  "ai-32": "topic-trust-safety",
  "ai-33": "topic-trust-safety",
  "ai-34": "topic-production-operations",
  "ai-35": "topic-cost-efficiency",
  "ai-36": "topic-serving-reliability",
  "ai-37": "topic-trust-safety",
  "ai-38": "topic-agent-reliability",
  "ai-39": "topic-production-operations",
  "ai-40": "topic-production-operations",
};

export const roadmapCanonicalTopicIds: Record<string, readonly CanonicalTopicId[]> = {
  "system-design": ["topic-serving-reliability", "topic-observability", "topic-production-operations"],
  cloud: ["topic-serving-reliability", "topic-observability", "topic-production-operations"],
  sprint: [
    "topic-decoding-control",
    "topic-retrieval-evaluation",
    "topic-agent-reliability",
    "topic-evaluation-judges",
    "topic-cost-efficiency",
    "topic-serving-reliability",
    "topic-trust-safety",
    "topic-observability",
    "topic-production-operations",
  ],
};

export function getCanonicalTopic(topicId: string) {
  return taxonomy.find((topic) => topic.topicId === topicId);
}
