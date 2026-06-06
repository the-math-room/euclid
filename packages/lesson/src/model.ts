import type { ActivityPolicy } from "@euclid/activity";
import type { AssessmentGoal } from "@euclid/assessment";
import type { EuclidDocument } from "@euclid/document";

export type EuclidLesson = Readonly<{
  schemaVersion: 1;
  title: string;
  description?: string;
  document: EuclidDocument;
  policy: ActivityPolicy;
  goals: readonly AssessmentGoal[];
}>;
