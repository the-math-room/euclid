import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConstructionProgram } from "@euclid/geometry";
import { lessons as staticLessons } from "./lessons/lessons";
import { WorkspaceContainer } from "./WorkspaceContainer";
import { decompressLessonFromUrlPayload, parseEuclidLesson, type EuclidLesson } from "@euclid/lesson";

export function App() {
  // Sync initialization from URL 'lessonData' search parameter to avoid synchronous setState inside useEffect
  const [lessons, setLessons] = useState<readonly EuclidLesson[]>(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get("lessonData");
    if (dataParam) {
      try {
        const loaded = decompressLessonFromUrlPayload(dataParam);
        return [...staticLessons, loaded];
      } catch (err) {
        console.error("Failed to parse custom lesson from URL payload:", err);
      }
    }
    return staticLessons;
  });

  const [activeLessonId, setActiveLessonId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get("lessonData");
    if (dataParam) {
      try {
        const loaded = decompressLessonFromUrlPayload(dataParam);
        return loaded.id;
      } catch {
        // fallback to default
      }
    }
    return staticLessons[0].id;
  });

  const activeLessonIndex = useMemo(() => {
    const idx = lessons.findIndex((l) => l.id === activeLessonId);
    return idx >= 0 ? idx : 0;
  }, [lessons, activeLessonId]);

  const activeLesson = lessons[activeLessonIndex];

  const [lessonPrograms, setLessonPrograms] = useState<Record<string, ConstructionProgram>>({});
  const [lessonVersions, setLessonVersions] = useState<Record<string, number>>({});

  const activeProgram = useMemo(() => {
    return lessonPrograms[activeLesson.id] ?? activeLesson.document.program;
  }, [lessonPrograms, activeLesson]);

  const handleProgramChange = useCallback(
    (newProgram: ConstructionProgram) => {
      setLessonPrograms((prev) => ({
        ...prev,
        [activeLesson.id]: newProgram,
      }));
    },
    [activeLesson.id],
  );

  const handleResetLesson = useCallback(() => {
    setLessonPrograms((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => key !== activeLesson.id)),
    );
    setLessonVersions((prev) => ({
      ...prev,
      [activeLesson.id]: (prev[activeLesson.id] ?? 0) + 1,
    }));
  }, [activeLesson.id]);

  const lessonVersion = lessonVersions[activeLesson.id] ?? 0;

  const [sizeScale, setSizeScale] = useState(() => {
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
    return isMobile ? 1.4 : 1.0;
  });

  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  // Load custom lessons from URL 'lessonUrl' search parameters asynchronously
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get("lessonUrl");

    if (urlParam) {
      fetch(urlParam)
        .then((r) => r.text())
        .then((text) => {
          const parsed = parseEuclidLesson(text);
          if (parsed.ok) {
            const loaded = parsed.lesson;
            setLessons((prev) => {
              const exists = prev.findIndex((l) => l.id === loaded.id);
              if (exists >= 0) {
                const next = [...prev];
                next[exists] = loaded;
                return next;
              }
              return [...prev, loaded];
            });
            setActiveLessonId(loaded.id);
          } else {
            console.error("Failed to parse custom lesson from URL:", parsed.diagnostics);
            alert("Failed to parse custom lesson from URL:\n" + parsed.diagnostics.join("\n"));
          }
        })
        .catch((err) => {
          console.error("Failed to fetch custom lesson:", err);
          alert("Failed to fetch custom lesson: " + err.message);
        });
    }
  }, []);

  const onLoadCustomLesson = useCallback((loaded: EuclidLesson) => {
    setLessons((prev) => {
      const exists = prev.findIndex((l) => l.id === loaded.id);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = loaded;
        return next;
      }
      return [...prev, loaded];
    });
    setActiveLessonId(loaded.id);
  }, []);

  const handleSelectLessonIndex = useCallback(
    (index: number) => {
      if (lessons[index]) {
        setActiveLessonId(lessons[index].id);
      }
    },
    [lessons],
  );

  return (
    <main className={`app-shell ${isDrawerExpanded ? "drawer-expanded" : ""}`}>
      <WorkspaceContainer
        key={`${activeLesson.id}-${lessonVersion}`}
        lessons={lessons}
        activeLesson={activeLesson}
        activeLessonIndex={activeLessonIndex}
        setActiveLessonIndex={handleSelectLessonIndex}
        activeProgram={activeProgram}
        onProgramChange={handleProgramChange}
        onResetLesson={handleResetLesson}
        onLoadCustomLesson={onLoadCustomLesson}
        sizeScale={sizeScale}
        setSizeScale={setSizeScale}
        isDrawerExpanded={isDrawerExpanded}
        setIsDrawerExpanded={setIsDrawerExpanded}
      />
    </main>
  );
}
