export interface Attendance {
    id?: number;
    student_sis_id: string;
    course_sis_id: string;
    attendance: string;
    count: number;
    marked_at: Date;
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
}
