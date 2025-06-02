export interface FilrterRequest {
    studentId: number,
    courseId: string,
    seniority: string,
    status: string,
    startDate: Date,
    endDate: Date,
    absenceLimitEnabled: string
    absentLimit: number
}
