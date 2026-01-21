import { SubjectKey } from "./subjects";
import { SubjectGrade } from "./grading";

export interface TransferApplicationInput {
  targetLevel: "中二" | "中三" | "中四" | "中五";
  subjects: SubjectKey[];
  grades: SubjectGrade[];
}

export interface UniversityApplicationInput {
  targetUniversities: string[];
  subjects: SubjectKey[];
  grades: SubjectGrade[];
}
