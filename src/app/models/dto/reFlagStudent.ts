import { StudentTracking } from "../entities/studentTracking";

export interface RedFlagStudents {
    id: number;
    student_sis_id: string;
    course_sis_id: string;
    attendance: string;
    count: number;
    seniority: string;
    marked_by_sis_id: string;
    course_name: string;
    instructor_name: string;
    status: string;
    grade: string;
    trmCde: string;
    absentLimit: number;
    firstName: string;
    lastName: string;
    meetings: StudentTracking[]
}
