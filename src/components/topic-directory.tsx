"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TopicEntry } from "@/content/types";
import { courses } from "@/content/catalog";
import { getCanonicalTopic, taxonomy } from "@/content/topic-taxonomy";

type TopicGroup = {
  topicId: string;
  label: string;
  summary: string;
  entries: TopicEntry[];
  mappedCourses: TopicEntry[];
};

export function TopicDirectory({ topics, draftCount, reviewedCount }: { topics: TopicEntry[]; draftCount: number; reviewedCount: number }) {
  const [query, setQuery] = useState("");
  const [moduleId, setModuleId] = useState("");
  const modules = courses.find((course) => course.id === "applied-ai")?.modules ?? [];
  const visibleTopics = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return topics.filter((topic) => (!moduleId || topic.moduleId === moduleId) && (!normalized || searchableText(topic).includes(normalized)));
  }, [query, moduleId, topics]);
  const roadmapEntries = visibleTopics.filter((topic) => !topic.lessonSlug);
  const showRoadmaps = !moduleId && roadmapEntries.length > 0;
  const groups = useMemo(() => {
    const visibleLessonEntries = visibleTopics.filter((topic) => topic.lessonSlug);
    return taxonomy
      .map((canonical): TopicGroup => ({
        topicId: canonical.topicId,
        label: canonical.label,
        summary: canonical.summary,
        entries: visibleLessonEntries.filter((topic) => topic.canonicalTopicId === canonical.topicId),
        mappedCourses: visibleTopics.filter((topic) => !topic.lessonSlug && topic.canonicalTopicIds?.includes(canonical.topicId)),
      }))
      .filter((group) => group.entries.length > 0 || group.mappedCourses.length > 0);
  }, [visibleTopics]);

  return <>
    <div className="topic-toolbar"><span>EXPLORE TOPICS <small>· {draftCount} chapter drafts, {reviewedCount} reviewed</small></span><div className="topic-controls"><label>Module <select aria-label="Filter topics by module" value={moduleId} onChange={(event) => setModuleId(event.target.value)}><option value="">All modules and roadmaps</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label><label className="topic-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search topics" placeholder="Search concepts" /></label></div></div>
    {visibleTopics.length ? <div className="topic-groups">
      {groups.map((group) => <section className="topic-group" key={group.topicId} data-topic={group.topicId}>
        <header className="topic-group-header">
          <h2>{group.label}</h2>
          <p>{group.summary}</p>
          <div className="topic-group-courses">
            <span className="topic-course-chip"><i></i> {group.entries.length} lesson {group.entries.length === 1 ? "draft" : "drafts"} · Reliable AI Applications</span>
            {group.mappedCourses.map((course) => <Link key={course.courseId} className="topic-course-chip roadmap" href={`/courses/${courses.find((entry) => entry.id === course.courseId)?.slug ?? "courses"}`}>{course.title} · roadmap</Link>)}
          </div>
        </header>
        {group.entries.length ? <div className="topic-grid">{group.entries.map((topic, index) => <article className="topic-card" key={topic.lessonSlug}><div className="topic-card-top"><span className="eyebrow">{topic.category}</span><span className="topic-number">{String(index + 1).padStart(2, "0")}</span></div><h2>{topic.title}</h2><p>{topic.description}</p><div className="topic-tags">{topic.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="topic-card-footer"><span className="available-label"><i></i> Lesson draft</span><Link href={`/learn/${topic.lessonSlug}`}>Open lesson <span>↗</span></Link></div></article>)}</div> : null}
      </section>)}
      {showRoadmaps ? <section className="topic-group topic-roadmaps" aria-label="Course roadmaps">
        <header className="topic-group-header"><h2>Course roadmaps</h2><p>Planned tracks mapped to the canonical topics their outlines already cover. Topic instruction is still in development.</p></header>
        <div className="topic-grid">{roadmapEntries.map((topic) => <article className="topic-card" key={topic.courseId}><div className="topic-card-top"><span className="eyebrow">{topic.category}</span></div><h2>{topic.title}</h2><p>{topic.description}</p><div className="topic-tags">{topic.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="topic-card-footer"><span className="development-label">Course in development</span><Link href={`/courses/${courses.find((course) => course.id === topic.courseId)?.slug ?? "courses"}`}>View roadmap <span>↗</span></Link></div></article>)}</div>
      </section> : null}
    </div> : <div className="topic-empty"><strong>No topics match your filters.</strong><button onClick={() => {setQuery("");setModuleId("");}}>Clear filters</button></div>}
  </>;
}

function searchableText(topic: TopicEntry) {
  const canonicalLabels = [
    topic.canonicalTopicId ? getCanonicalTopic(topic.canonicalTopicId)?.label ?? "" : "",
    ...(topic.canonicalTopicIds ?? []).map((topicId) => getCanonicalTopic(topicId)?.label ?? ""),
  ].filter(Boolean);
  return [topic.title, topic.category, topic.description, ...topic.tags, ...canonicalLabels].join(" ").toLowerCase();
}
