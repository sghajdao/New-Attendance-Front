/// <reference lib="webworker" />

import { Attendance } from "./models/entities/attendance";

addEventListener('message', ({ data }: { data: Attendance[] }) => {
  let report: Attendance[] = []
  for (let a of data) {
    let item: Attendance = {
      sis_student_id: a.sis_student_id,
      first_name: a.first_name,
      last_name: a.last_name,
      sis_course_id: a.sis_course_id,
      attendance: a.attendance,
      count: data.filter(i => i.sis_student_id === a.sis_student_id && i.sis_course_id === a.sis_course_id && i.attendance === a.attendance).length,
      current_class_cde: a.current_class_cde,
      sis_teacher_id: a.sis_teacher_id,
      course_code: a.course_code,
      status: a.status,
      grade: a.grade,
      teacher_name: a.teacher_name,
      absent_limit: a.absent_limit,
    }
    if (a.wf_requested_on)
      item.wf_requested_on = a.wf_requested_on
    if (a.wf_approved_on)
      item.wf_approved_on = a.wf_approved_on
    if (!report.filter(i => i.sis_student_id === item.sis_student_id && i.sis_course_id === item.sis_course_id && i.attendance === item.attendance).length)
      report.push(item)
  }
  postMessage(report);
});
