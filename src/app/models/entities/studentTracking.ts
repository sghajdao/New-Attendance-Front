export interface StudentTracking {
    id?: number;
    studentSisId?: string;
    firstName?: string;
    lastName?: string;
    coursSisId?: string[];
    createdAt?: Date;
    meetingType?: string;
    mailType?: string;
    categories?: string[];
    comment?: string;
}
