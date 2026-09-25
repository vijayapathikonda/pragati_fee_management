import api from './api';

export interface SubjectScheduleItem {
  name: string;
  max_marks: string;
  date: string;
  time: string;
}

export interface HallTicketBatchRequest {
  grade_id: number;
  exam_name: string;
  academic_year: string;
  subjects: SubjectScheduleItem[];
}

export interface HallTicketStudent {
  id: number;
  serial_number?: number;
  admission_number: string;
  student_name: string;
  father_name?: string;
  photo_path?: string;
  section_name?: string;
}

export const getGrades = async () => {
  const response = await api.get('/masters/grades');
  const res = response.data;
  return Array.isArray(res) ? res : res.data || [];
};

export const getHallTicketStudents = async (gradeId: number): Promise<HallTicketStudent[]> => {
  const response = await api.get('/hall-tickets/students', {
    params: { grade_id: gradeId }
  });
  return response.data;
};

export const downloadHallTicketsPdf = async (request: HallTicketBatchRequest, filename?: string): Promise<void> => {
  const response = await api.post('/hall-tickets/generate-pdf', request, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || `Hall_Tickets_Grade_${request.grade_id}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};
