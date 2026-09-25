import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Alert, CircularProgress, Avatar,
  Divider, Card
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import SchoolIcon from '@mui/icons-material/School';
import EventNoteIcon from '@mui/icons-material/EventNote';

import {
  getGrades, getHallTicketStudents, downloadHallTicketsPdf,
  SubjectScheduleItem, HallTicketStudent
} from '../../services/hallTicket';

const DEFAULT_SUBJECTS: SubjectScheduleItem[] = [
  { name: 'Kannada', max_marks: '100', date: '2026-09-22', time: '10:00 AM - 12:30 PM' },
  { name: 'English', max_marks: '100', date: '2026-09-23', time: '10:00 AM - 12:30 PM' },
  { name: 'Hindi', max_marks: '100', date: '2026-09-24', time: '10:00 AM - 12:30 PM' },
  { name: 'Mathematics', max_marks: '100', date: '2026-09-25', time: '10:00 AM - 12:30 PM' },
  { name: 'Science', max_marks: '100', date: '2026-09-26', time: '10:00 AM - 12:30 PM' },
  { name: 'Social Science', max_marks: '100', date: '2026-09-28', time: '10:00 AM - 12:30 PM' },
];

export default function HallTicketPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number>(1);
  const [students, setStudents] = useState<HallTicketStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Exam Configuration
  const [examName, setExamName] = useState('Quarterly Examination');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [subjects, setSubjects] = useState<SubjectScheduleItem[]>(DEFAULT_SUBJECTS);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    loadGrades();
  }, []);

  useEffect(() => {
    if (selectedGradeId) {
      loadStudents(selectedGradeId);
    }
  }, [selectedGradeId]);

  const loadGrades = async () => {
    try {
      const data = await getGrades();
      setGrades(data);
      if (data.length > 0) {
        const grade1 = data.find((g: any) => g.name === 'Grade 1');
        setSelectedGradeId(grade1 ? grade1.id : data[0].id);
      }
    } catch (err) {
      console.error('Failed to load grades', err);
    }
  };

  const loadStudents = async (gradeId: number) => {
    setLoadingStudents(true);
    try {
      const data = await getHallTicketStudents(gradeId);
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students for hall ticket', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSubjectChange = (index: number, field: keyof SubjectScheduleItem, value: string) => {
    setSubjects(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddSubject = () => {
    setSubjects(prev => [
      ...prev,
      { name: '', max_marks: '100', date: '', time: '10:00 AM - 12:30 PM' }
    ]);
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleResetSubjects = () => {
    setSubjects(DEFAULT_SUBJECTS);
  };

  const handleDownloadPdf = async () => {
    if (!selectedGradeId || students.length === 0) return;
    setDownloadingPdf(true);
    try {
      const currentGrade = grades.find(g => g.id === selectedGradeId);
      const gradeName = currentGrade ? currentGrade.name : `Grade_${selectedGradeId}`;
      const filename = `Hall_Tickets_${gradeName.replace(/\s+/g, '_')}_${examName.replace(/\s+/g, '_')}.pdf`;
      
      await downloadHallTicketsPdf({
        grade_id: selectedGradeId,
        exam_name: examName,
        academic_year: academicYear,
        subjects
      }, filename);
    } catch (err) {
      console.error('Failed to download PDF', err);
      alert('Error generating hall tickets PDF. Please check server logs.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentGrade = grades.find(g => g.id === selectedGradeId);
  const gradeName = currentGrade ? currentGrade.name : 'Selected Grade';
  const totalSheets = Math.ceil(students.length / 2);

  // Group students in pairs of 2 per A4 sheet
  const studentPairs: HallTicketStudent[][] = [];
  for (let i = 0; i < students.length; i += 2) {
    studentPairs.push(students.slice(i, i + 2));
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Page Header (Hidden during Print) */}
      <Box className="no-print" sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <SchoolIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Examination Hall Ticket Generator
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Batch generate, customize exam timetables, and print 2-per-page A4 examination hall tickets with student photos.
        </Typography>
      </Box>

      {/* TOP CONFIGURATION CARD (Hidden during Print) */}
      <Paper className="no-print" sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Grid container spacing={2.5}>
          {/* Grade Selector */}
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Select Class / Grade"
              value={selectedGradeId || ''}
              onChange={e => setSelectedGradeId(Number(e.target.value))}
            >
              {grades.map(g => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Exam Name */}
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              size="small"
              label="Examination Title"
              value={examName}
              onChange={e => setExamName(e.target.value)}
              placeholder="e.g. Quarterly Examination - 2026-2027"
            />
            {/* Quick Presets */}
            <Box sx={{ display: 'flex', gap: 0.8, mt: 1 }}>
              {['Quarterly Examination', 'Mid-Term Examination', 'Preparatory Exam', 'Annual Examination'].map(preset => (
                <Chip
                  key={preset}
                  label={preset}
                  size="small"
                  variant={examName === preset ? 'filled' : 'outlined'}
                  color={examName === preset ? 'primary' : 'default'}
                  onClick={() => setExamName(preset)}
                  sx={{ fontSize: '0.72rem', cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Grid>

          {/* Academic Year */}
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Academic Year"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="2026-2027"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        {/* Timetable Configuration Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventNoteIcon fontSize="small" color="primary" />
            Subject Timetable & Schedule ({subjects.length} Subjects)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={handleResetSubjects}
              sx={{ textTransform: 'none' }}
            >
              Reset Schedule
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleAddSubject}
              sx={{ textTransform: 'none' }}
            >
              Add Subject
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: '5%' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, width: '35%' }}>Subject Name</TableCell>
                <TableCell sx={{ fontWeight: 700, width: '15%' }}>Max Marks</TableCell>
                <TableCell sx={{ fontWeight: 700, width: '20%' }}>Exam Date</TableCell>
                <TableCell sx={{ fontWeight: 700, width: '20%' }}>Exam Time</TableCell>
                <TableCell sx={{ fontWeight: 700, width: '5%', textAlign: 'center' }}>Remove</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subjects.map((sub, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={sub.name}
                      placeholder="e.g. Mathematics"
                      onChange={e => handleSubjectChange(idx, 'name', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={sub.max_marks}
                      onChange={e => handleSubjectChange(idx, 'max_marks', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      value={sub.date}
                      onChange={e => handleSubjectChange(idx, 'date', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={sub.time}
                      placeholder="10:00 AM - 12:30 PM"
                      onChange={e => handleSubjectChange(idx, 'time', e.target.value)}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveSubject(idx)}
                      disabled={subjects.length <= 1}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Status bar & Action Buttons */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mt: 3, gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={`${students.length} Students in ${gradeName}`}
              color="primary"
              sx={{ fontWeight: 700 }}
            />
            <Chip
              icon={<ContentCutIcon />}
              label={`${totalSheets} A4 Sheets to Print (2 Tickets / Page)`}
              variant="outlined"
              color="secondary"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              startIcon={downloadingPdf ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || students.length === 0}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {downloadingPdf ? 'Generating PDF...' : 'Download Consolidated PDF'}
            </Button>

            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={students.length === 0}
              sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}
            >
              Print Hall Tickets (2 per Sheet)
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ========================================================================= */}
      {/* PRINTABLE / LIVE PREVIEW CONTAINER */}
      {/* ========================================================================= */}
      <Box id="printable-hall-tickets">
        {loadingStudents ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : students.length === 0 ? (
          <Alert severity="info">
            No active students found in {gradeName}.
          </Alert>
        ) : (
          studentPairs.map((pair, pageIndex) => (
            <Box
              key={pageIndex}
              className="hall-ticket-a4-page"
              sx={{
                width: '100%',
                maxWidth: '210mm',
                bgcolor: '#ffffff',
                mx: 'auto',
                mb: 4,
                p: '6mm 10mm',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                '@media print': {
                  boxShadow: 'none',
                  p: '0 !important',
                  m: '0 !important',
                  maxWidth: '100% !important',
                  pageBreakAfter: 'always !important',
                  breakAfter: 'page !important',
                  pageBreakInside: 'avoid !important',
                  breakInside: 'avoid !important',
                  height: 'auto !important',
                  minHeight: 'auto !important',
                  maxHeight: '272mm !important',
                  overflow: 'hidden !important',
                },
              }}
            >
              {/* UPPER TICKET */}
              {renderSingleHallTicket(pair[0], gradeName, examName, academicYear, subjects)}

              {/* CENTER SCISSOR CUT GUIDE */}
              <Box
                className="cut-line-guide"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  my: 0.6,
                  userSelect: 'none',
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                }}
              >
                <Box sx={{ flex: 1, borderTop: '1px dashed #94a3b8' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.5, color: '#64748b', fontSize: '0.7rem', fontWeight: 700 }}>
                  <ContentCutIcon sx={{ fontSize: 14 }} />
                  <span>Cut Here to Separate Hall Tickets</span>
                  <ContentCutIcon sx={{ fontSize: 14, transform: 'rotate(180deg)' }} />
                </Box>
                <Box sx={{ flex: 1, borderTop: '1px dashed #94a3b8' }} />
              </Box>

              {/* LOWER TICKET (if pair has 2nd student) */}
              {pair[1] ? (
                renderSingleHallTicket(pair[1], gradeName, examName, academicYear, subjects)
              ) : (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1', borderRadius: 1, minHeight: 80 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    [ End of student roster - blank space ]
                  </Typography>
                </Box>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* Global Print Styles */}
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 5mm 8mm;
          }
          @media print {
            html, body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
            }
            .no-print,
            header,
            nav,
            aside,
            button,
            .MuiDrawer-root,
            .MuiAppBar-root {
              display: none !important;
            }
            body * {
              visibility: hidden;
            }
            #printable-hall-tickets, #printable-hall-tickets * {
              visibility: visible !important;
            }
            #printable-hall-tickets {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .hall-ticket-a4-page {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              height: auto !important;
              max-height: 272mm !important;
              box-sizing: border-box !important;
              box-shadow: none !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
            .hall-ticket-card {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}
      </style>
    </Box>
  );
}

/**
 * Helper to render an individual, authentic Hall Ticket card
 */
function renderSingleHallTicket(
  student: HallTicketStudent,
  gradeName: string,
  examName: string,
  academicYear: string,
  subjects: SubjectScheduleItem[]
) {
  return (
    <Card
      variant="outlined"
      className="hall-ticket-card"
      sx={{
        borderColor: '#334155',
        borderWidth: 1.2,
        borderRadius: 1.5,
        p: 1.2,
        bgcolor: '#ffffff',
        fontFamily: '"Times New Roman", Times, Georgia, serif',
        color: '#0f172a',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        overflow: 'hidden',
      }}
    >
      {/* 1. School Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0.3, borderBottom: '1px solid #cbd5e1', gap: 1 }}>
        <Box
          component="img"
          src="/logo.jpeg"
          alt="School Logo"
          sx={{ width: 42, height: 42, objectFit: 'contain', flexShrink: 0 }}
        />
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Times New Roman", serif',
              fontWeight: 900,
              fontSize: '1.15rem',
              color: '#b91c1c', // Crimson
              lineHeight: 1.1,
              letterSpacing: '0.04em',
            }}
          >
            PRAGATI VIDYALAYA, Challakere
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', mt: 0.15 }}>
            CBSE Affiliated No. 831401 &nbsp;|&nbsp; DISE No. 29130220703 &nbsp;|&nbsp; Mob: 7996622466 / 8660573737
          </Typography>
          <Typography sx={{ fontSize: '0.66rem', color: '#64748b' }}>
            Near Bhutappa Temple, Nagaramgere Road, Challakere - 577522, Chitradurga Dist.
          </Typography>
        </Box>
        <Box sx={{ width: 42, flexShrink: 0 }} />
      </Box>

      {/* 2. Exam Banner */}
      <Box
        sx={{
          bgcolor: '#f1f5f9',
          py: 0.25,
          my: 0.4,
          textAlign: 'center',
          borderTop: '1px solid #cbd5e1',
          borderBottom: '1px solid #cbd5e1',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Times New Roman", serif',
            fontWeight: 800,
            fontSize: '0.8rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {examName} – HALL TICKET ({academicYear})
        </Typography>
      </Box>

      {/* 3. Student Details Grid with Photo */}
      <Box sx={{ display: 'flex', gap: 1.5, my: 0.4, alignItems: 'flex-start' }}>
        {/* Left Information Fields */}
        <Box sx={{ flex: 1 }}>
          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', lineHeight: 1.35 }}>
            <tbody>
              <tr>
                <td style={{ width: '26%', fontWeight: 'bold', color: '#475569' }}>STUDENT NAME:</td>
                <td style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                  {student.student_name?.toUpperCase() || '-'}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', color: '#475569' }}>FATHER'S NAME:</td>
                <td style={{ fontWeight: 600 }}>{student.father_name?.toUpperCase() || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', color: '#475569' }}>CLASS / SECTION:</td>
                <td>
                  <strong>{gradeName}</strong> {student.section_name ? ` - Section ${student.section_name}` : ''}
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <span style={{ color: '#475569', fontWeight: 'bold' }}>ROLL / S.N:</span>{' '}
                  <strong>{student.serial_number || '-'}</strong>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', color: '#475569' }}>ADMISSION NO:</td>
                <td>
                  <strong>{student.admission_number || '-'}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </Box>

        {/* Right Photo Avatar Box */}
        <Box sx={{ textAlign: 'center' }}>
          <Avatar
            src={student.photo_path}
            alt={student.student_name}
            variant="rounded"
            sx={{
              width: 58,
              height: 72,
              borderRadius: 1,
              border: '1px solid #334155',
              bgcolor: '#e2e8f0',
              color: '#334155',
              fontSize: '1.3rem',
              fontWeight: 700,
            }}
          >
            {student.student_name ? student.student_name[0] : 'S'}
          </Avatar>
        </Box>
      </Box>

      {/* 4. Subject Timetable Table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.74rem',
          margin: '3px 0',
          textAlign: 'center',
        }}
      >
        <thead>
          <tr style={{ background: '#f8fafc', color: '#1e293b' }}>
            <th style={{ border: '1px solid #475569', padding: '2px 4px', width: '6%' }}>SL</th>
            <th style={{ border: '1px solid #475569', padding: '2px 6px', textAlign: 'left', width: '32%' }}>SUBJECT</th>
            <th style={{ border: '1px solid #475569', padding: '2px 4px', width: '14%' }}>MAX MARKS</th>
            <th style={{ border: '1px solid #475569', padding: '2px 4px', width: '16%' }}>EXAM DATE</th>
            <th style={{ border: '1px solid #475569', padding: '2px 4px', width: '18%' }}>TIME</th>
            <th style={{ border: '1px solid #475569', padding: '2px 4px', width: '14%' }}>INVIGILATOR</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((sub, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
              <td style={{ border: '1px solid #64748b', padding: '2px 4px' }}>{idx + 1}</td>
              <td style={{ border: '1px solid #64748b', padding: '2px 6px', textAlign: 'left', fontWeight: 600 }}>{sub.name}</td>
              <td style={{ border: '1px solid #64748b', padding: '2px 4px' }}>{sub.max_marks}</td>
              <td style={{ border: '1px solid #64748b', padding: '2px 4px' }}>{sub.date || '-'}</td>
              <td style={{ border: '1px solid #64748b', padding: '2px 4px', fontSize: '0.7rem' }}>{sub.time || '-'}</td>
              <td style={{ border: '1px solid #64748b', padding: '2px 4px' }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 5. Signatures Footer with Principal Signature */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          mt: 1.0,
          pt: 0.2,
          px: 1.5,
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <Box sx={{ textAlign: 'center', minWidth: '100px' }}>
          <Box sx={{ height: '26px' }} />
          <div style={{ width: '100px', borderBottom: '1px solid #475569', marginBottom: '2px' }}></div>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700 }}>STUDENT SIGNATURE</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', minWidth: '100px' }}>
          <Box sx={{ height: '26px' }} />
          <div style={{ width: '100px', borderBottom: '1px solid #475569', marginBottom: '2px' }}></div>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700 }}>CLASS TEACHER</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', minWidth: '105px' }}>
          <Box sx={{ height: '26px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', mb: '-2px' }}>
            <img
              src="/principal_signature.png"
              alt="Principal Signature"
              style={{
                height: '24px',
                maxWidth: '95px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Box>
          <div style={{ width: '105px', borderBottom: '1px solid #475569', marginBottom: '2px' }}></div>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700 }}>PRINCIPAL</Typography>
        </Box>
      </Box>
    </Card>
  );
}
