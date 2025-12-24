export interface WflistResponse {
    id?: number,
    teacher_id: number,
    teacher_name: string,
    student_id: number,
    request_date: Date,
    course: string,
    count: number,
    wf: boolean,
    course_cde: string,
    absent_limit: number,
    approve_date?: Date,
    first_name?: string,
    last_name?: string
}
