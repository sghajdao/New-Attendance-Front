export interface Attendance {
    id?: number,
    sis_student_id: number,
    sis_course_id: string,
    attendance: string,
    count: number,
    class_date?: Date
    current_class_cde: string,
    sis_teacher_id: number,
    course_code: string,
    teacher_name: string
}
