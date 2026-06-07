import { useCallback, useMemo, useState } from "react";
import type { ConstructionProgram } from "@euclid/geometry";
import { lessons } from "./lessons/lessons";
import { WorkspaceContainer } from "./WorkspaceContainer";

export function App() {
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
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

  return (
    <main className={`app-shell ${isDrawerExpanded ? "drawer-expanded" : ""}`}>
      <WorkspaceContainer
        key={`${activeLesson.id}-${lessonVersion}`}
        activeLesson={activeLesson}
        activeLessonIndex={activeLessonIndex}
        setActiveLessonIndex={setActiveLessonIndex}
        activeProgram={activeProgram}
        onProgramChange={handleProgramChange}
        onResetLesson={handleResetLesson}
        sizeScale={sizeScale}
        setSizeScale={setSizeScale}
        isDrawerExpanded={isDrawerExpanded}
        setIsDrawerExpanded={setIsDrawerExpanded}
      />
    </main>
  );
}
