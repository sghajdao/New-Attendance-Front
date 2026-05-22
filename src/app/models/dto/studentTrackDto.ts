export interface StudentTrackDto {
    id?: number;
    studentSisId?: string;
    studentName?: string;
    coursSisId?: string[];
    createdAt?: Date;
    meetingType?: string;
    mailType?: string;
    categories?: string[];
    comment?: string;
}
