import { Subject } from "./subjects";
import { CivicsStatus } from "./civics";

export type GradeValue = string | CivicsStatus;

export interface SubjectGrade {
  subject: Subject;
  value: GradeValue;
}
