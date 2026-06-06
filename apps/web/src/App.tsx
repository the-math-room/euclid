import { useCallback, useMemo, useState } from "react";
import type { ConstructionProgram } from "@euclid/geometry";
import { lessons } from "./lessons/lessons";
import { WorkspaceContainer } from "./WorkspaceContainer";

export function App() {
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const activeLesson = lessons[activeLessonIndex];

  const [lessonPrograms, setLessonPrograms] = useState<Record<number, ConstructionProgram>>({});
  const [lessonVersions, setLessonVersions] = useState<Record<number, number>>({});

  const activeProgram = useMemo(() => {
    return lessonPrograms[activeLessonIndex] ?? activeLesson.document.program;
  }, [activeLessonIndex, lessonPrograms, activeLesson]);

  const handleProgramChange = useCallback(
    (newProgram: ConstructionProgram) => {
      setLessonPrograms((prev) => ({
        ...prev,
        [activeLessonIndex]: newProgram,
      }));
    },
    [activeLessonIndex],
  );

  const handleResetLesson = useCallback(() => {
    setLessonPrograms((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => Number(key) !== activeLessonIndex)),
    );
    setLessonVersions((prev) => ({
      ...prev,
      [activeLessonIndex]: (prev[activeLessonIndex] ?? 0) + 1,
    }));
  }, [activeLessonIndex]);

  const lessonVersion = lessonVersions[activeLessonIndex] ?? 0;

  const [sizeScale, setSizeScale] = useState(() => {
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
    return isMobile ? 1.4 : 1.0;
  });

  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  return (
    <main className={`app-shell ${isDrawerExpanded ? "drawer-expanded" : ""}`}>
      <WorkspaceContainer
        key={`${activeLessonIndex}-${lessonVersion}`}
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
