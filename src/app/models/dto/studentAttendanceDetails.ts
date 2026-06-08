import { StudentTracking } from "../entities/studentTracking";

export interface StudentAttendanceDetails {
    idNum: string;
    firstName: string;
    lastName: string;
    crsCde: string;
    schoolCde: string;
    yrCde: string;
    trmCde: string;
    crsDiv: string;
    studentDiv: string;
    status: string;
    grade: string;
    gradeChangeDate: Date;
    schedule: string;
    entanceYr: string;
    entanceTrm: string;
    visaType: string;
    seniority: string;
    attendance: string;
    attendanceDate: Date;
    attendanceTime: Date;
    absentLimit: number;
    teacherId: string;
    teacherName: string;
    midtermGrade: string;
    major: string;
    hold: string;
    trmGpa: number;
    wfReason: string;
    probation: string;
    meetings: StudentTracking[];
}
