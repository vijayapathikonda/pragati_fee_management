import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, TextField, Typography, IconButton,
  MenuItem, Select, FormControl, InputLabel, Grid, Avatar
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { getStudents, exportStudents, importStudents, deleteStudent } from '../../services/student';
import api from '../../services/api';

export default function StudentList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'serial_number', sort: 'asc' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [gradeId, setGradeId] = useState('all');
  const [status, setStatus] = useState('all');
  
  // Master data for filters
  const [grades, setGrades] = useState([]);

  useEffect(() => {
    // Fetch filter options
    api.get('/masters/grades').then(res => setGrades(res.data.data));
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = {
        page: paginationModel.page + 1,
        size: paginationModel.pageSize,
        search: searchQuery,
        grade_id: (gradeId && gradeId !== 'all') ? gradeId : undefined,
        status: (status && status !== 'all') ? status : undefined,
        sort_by: sortModel[0]?.field,
        sort_order: sortModel[0]?.sort,
      };
      const response = await getStudents(params);
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch students', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRows();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [paginationModel, sortModel, searchQuery, gradeId, status]);

  const handleExport = async () => {
    try {
      const params = { 
        grade_id: (gradeId && gradeId !== 'all') ? gradeId : undefined, 
        status: (status && status !== 'all') ? status : undefined 
      };
      const blob = await exportStudents(params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Students_Export.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed', error);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setLoading(true);
        const result = await importStudents(e.target.files[0]);
        
        let message = `Successfully imported: ${result.success} students.\n`;
        if (result.errors && result.errors.length > 0) {
          message += `\nErrors (${result.errors.length}):\n` + result.errors.slice(0, 10).join('\n');
          if (result.errors.length > 10) message += `\n...and ${result.errors.length - 10} more.`;
        }
        
        alert(message);
        fetchRows();
      } catch (error) {
        console.error('Import failed', error);
        alert('Import failed. Please check the file format.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      try {
        await deleteStudent(id);
        fetchRows();
      } catch (error: any) {
        console.error('Failed to delete student', error);
        alert(error.response?.data?.detail || 'Failed to delete student. They may have dependent records.');
      }
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'serial_number',
      headerName: 'SN',
      width: 70,
      renderCell: (params) => {
        const rowIndex = rows.findIndex((r: any) => r.id === params.row.id);
        const displayIndex = rowIndex !== -1 
          ? paginationModel.page * paginationModel.pageSize + rowIndex + 1 
          : (params.value ?? '-');
        return (
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {displayIndex}
          </Typography>
        );
      },
    },
    {
      field: 'admission_number',
      headerName: 'ADM #',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'first_name',
      headerName: 'Student Name',
      width: 240,
      valueGetter: (_val, row) => `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={params.row.photo_path || undefined}
            alt={params.row.first_name}
            variant="rounded"
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.main',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {params.row.first_name ? params.row.first_name.charAt(0).toUpperCase() : 'S'}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.row.first_name} {params.row.last_name}
          </Typography>
        </Box>
      ),
    },
    { field: 'grade', headerName: 'Grade', width: 110, valueGetter: (params: any) => params?.name || '-' },
    {
      field: 'father_name',
      headerName: 'Father Name',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2">{params.value || '-'}</Typography>
      ),
    },
    {
      field: 'father_contact_number',
      headerName: 'Contact No',
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {params.value || params.row.contact_number || '-'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const isAct = params.value === 'Active';
        return (
          <Box
            component="span"
            sx={{
              px: 1.25,
              py: 0.35,
              borderRadius: '6px',
              fontSize: '0.725rem',
              fontWeight: 700,
              bgcolor: isAct ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isAct ? '#059669' : '#dc2626',
            }}
          >
            {params.value || 'Active'}
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => navigate(`/students/${params.row.id}`)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: 1300, mx: 'auto', pb: 6 }}>
      {/* Header bar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Student Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage student enrollments, profiles, and class assignments.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <input
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
            id="raised-button-file"
            type="file"
            onChange={handleImport}
          />
          <label htmlFor="raised-button-file">
            <Button variant="outlined" component="span" startIcon={<FileUploadIcon />} sx={{ borderRadius: 2 }}>
              Import
            </Button>
          </label>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport} sx={{ borderRadius: 2 }}>
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/students/new')}
            sx={{ borderRadius: 2 }}
          >
            New Admission
          </Button>
        </Box>
      </Box>

      {/* Filter strip */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Search by student, father, ADM #..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Grade</InputLabel>
              <Select value={gradeId} label="Grade" onChange={(e) => setGradeId(e.target.value)}>
                <MenuItem value="all"><em>All Grades</em></MenuItem>
                {grades.map((g: any) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="all"><em>All Statuses</em></MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="Graduated">Graduated</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table Paper */}
      <Paper sx={{ height: 620, width: '100%', borderRadius: 3.5, overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          paginationMode="server"
          rowCount={total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          loading={loading}
          pageSizeOptions={[5, 10, 20, 50]}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
              fontWeight: 700,
            },
          }}
        />
      </Paper>
    </Box>
  );
}
