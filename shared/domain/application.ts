import { Subject } from "./subjects";
import { SubjectGrade } from "./grading";

export interface TransferApplicationInput {
  targetLevel: "中二" | "中三" | "中四" | "中五";
  subjects: Subject[];
  grades: SubjectGrade[];
}

export interface UniversityApplicationInput {
  targetUniversities: string[];
  subjects: Subject[];
  grades: SubjectGrade[];
}
