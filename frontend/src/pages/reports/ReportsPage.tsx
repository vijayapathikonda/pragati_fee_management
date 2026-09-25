import { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Button,
  FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../services/api';
import { getReport, downloadReport } from '../../services/report';
import { getStudents } from '../../services/student';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('outstanding');
  
  // Masters
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Filters
  const [academicYearId, setAcademicYearId] = useState<number | ''>('');
  const [gradeId, setGradeId] = useState<number | ''>('');
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [studentId, setStudentId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Data
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    api.get('/masters/academic-years?size=100&sort_by=id&sort_order=asc').then(res => setAcademicYears(res.data.data));
    api.get('/masters/grades?size=100&sort_by=id&sort_order=asc').then(res => setGrades(res.data.data));
    api.get('/masters/sections?size=100&sort_by=id&sort_order=asc').then(res => setSections(res.data.data));
    getStudents({ page: 1, size: 1000 }).then(res => setStudents(res.data));
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (academicYearId) params.academic_year_id = academicYearId;
      if (gradeId) params.grade_id = gradeId;
      if (sectionId) params.section_id = sectionId;
      if (studentId) params.student_id = studentId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const data = await getReport(reportType, params);
      setReportData(data);
    } catch (error: any) {
      alert("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: string) => {
    const params: any = {};
    if (academicYearId) params.academic_year_id = academicYearId;
    if (gradeId) params.grade_id = gradeId;
    if (sectionId) params.section_id = sectionId;
    if (studentId) params.student_id = studentId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    downloadReport(reportType, format, params);
  };

  // Setup DataGrid columns
  let columns: GridColDef[] = [];
  if (reportData && reportData.columns) {
    columns = reportData.columns.map((col: any) => ({
      field: col.field,
      headerName: col.headerName,
      flex: 1,
      minWidth: 120,
      type: col.type === 'number' ? 'number' : 'string'
    }));
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1300, mx: 'auto', pb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Financial Intelligence & Reports
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generate comprehensive audit registers, collection ledgers, and overdue analytics.
        </Typography>
      </Box>
      
      {/* Filter Card */}
      <Paper sx={{ p: 3, mb: 3.5, borderRadius: 3.5 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Report Type</InputLabel>
              <Select value={reportType} label="Report Type" onChange={(e) => setReportType(e.target.value)}>
                <MenuItem value="outstanding">Outstanding Fees Register</MenuItem>
                <MenuItem value="ledger">Student Ledger Account</MenuItem>
                <MenuItem value="collection">Collection Register (Daily)</MenuItem>
                <MenuItem value="discounts">Discounts & Scholarships</MenuItem>
                <MenuItem value="overdue">Overdue / Late Fee Register</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              {reportType !== 'ledger' && (
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Academic Year</InputLabel>
                    <Select value={academicYearId} label="Academic Year" onChange={(e) => setAcademicYearId(e.target.value as number)}>
                      <MenuItem value=""><em>All Academic Years</em></MenuItem>
                      {academicYears.map(ay => <MenuItem key={ay.id} value={ay.id}>{ay.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              {reportType === 'outstanding' && (
                <>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Grade</InputLabel>
                      <Select value={gradeId} label="Grade" onChange={(e) => setGradeId(e.target.value as number)}>
                        <MenuItem value=""><em>All Grades</em></MenuItem>
                        {grades.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Section</InputLabel>
                      <Select value={sectionId} label="Section" onChange={(e) => setSectionId(e.target.value as number)}>
                        <MenuItem value=""><em>All Sections</em></MenuItem>
                        {sections.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
              
              {reportType === 'collection' && (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="End Date" type="date" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </Grid>
                </>
              )}
              
              {reportType === 'ledger' && (
                <Grid item xs={12} sm={8}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Student</InputLabel>
                    <Select value={studentId} label="Student" onChange={(e) => setStudentId(e.target.value as number)}>
                      {students.map(s => <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Grid>
          
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={loading || (reportType === 'ledger' && !studentId)}
              sx={{ px: 3, py: 1, borderRadius: 2 }}
            >
              {loading ? 'Generating Report...' : 'Generate Report'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Generated Report View */}
      {reportData && (
        <Paper sx={{ p: 3, borderRadius: 3.5, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2, mb: 2.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{reportData.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {reportData.rows?.length || 0} records matched criteria
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<PictureAsPdfIcon />}
                onClick={() => handleExport('pdf')}
                variant="outlined"
                color="error"
                size="small"
                sx={{ borderRadius: 2 }}
              >
                PDF
              </Button>
              <Button
                startIcon={<TableViewIcon />}
                onClick={() => handleExport('excel')}
                variant="outlined"
                color="success"
                size="small"
                sx={{ borderRadius: 2 }}
              >
                Excel
              </Button>
              <Button
                startIcon={<DownloadIcon />}
                onClick={() => handleExport('csv')}
                variant="outlined"
                color="secondary"
                size="small"
                sx={{ borderRadius: 2 }}
              >
                CSV
              </Button>
            </Box>
          </Box>
          
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={reportData.rows}
              columns={columns}
              disableRowSelectionOnClick
              density="compact"
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
                  fontWeight: 700,
                },
              }}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
}
