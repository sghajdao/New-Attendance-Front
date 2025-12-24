export interface FilrterRequest {
    userId?: number,
    userEmail?: string,
    session: string,
    studentIds: number[],
    courseId: string,
    seniority: string,
    status: string,
    grade: string[] | null,
    wfLevel:string | null,
    startDate: Date,
    endDate: Date
}
