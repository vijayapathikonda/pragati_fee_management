import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  InputAdornment,
  Tooltip,
  useTheme,
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../services/api';

interface MasterCrudViewProps {
  title: string;
  endpoint: string;
  columns: GridColDef[];
  FormComponent: React.FC<{ data: any; onSubmit: (data: any) => void; onCancel: () => void }>;
}

export default function MasterCrudView({ title, endpoint, columns, FormComponent }: MasterCrudViewProps) {
  const theme = useTheme();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // DataGrid State
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [open, setOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = {
        page: paginationModel.page + 1,
        size: paginationModel.pageSize,
        search: searchQuery,
        sort_by: sortModel[0]?.field,
        sort_order: sortModel[0]?.sort,
      };
      const response = await api.get(endpoint, { params });
      setRows(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRows();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [paginationModel, sortModel, searchQuery]);

  const handleExport = async () => {
    try {
      const response = await api.get(`${endpoint}/export/excel`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Export.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await api.delete(`${endpoint}/${id}`);
        fetchRows();
      } catch (error) {
        console.error('Failed to delete', error);
      }
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingData) {
        await api.put(`${endpoint}/${editingData.id}`, data);
      } else {
        await api.post(endpoint, data);
      }
      setOpen(false);
      fetchRows();
    } catch (error) {
      console.error('Failed to save', error);
    }
  };

  const openForm = (data: any = null) => {
    setEditingData(data);
    setOpen(true);
  };

  // Add Action Columns
  const actionColumn: GridColDef = {
    field: 'actions',
    headerName: 'Actions',
    width: 110,
    sortable: false,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="Edit" arrow>
          <IconButton
            size="small"
            onClick={() => openForm(params.row)}
            sx={{
              color: 'primary.main',
              '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' },
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete" arrow>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id)}
            sx={{
              color: 'error.main',
              '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  };

  const finalColumns = [...columns, actionColumn];

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', pb: 6 }}>
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
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and configure master records and reference parameters.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={handleExport}
            sx={{ borderRadius: 2 }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openForm()}
            sx={{ borderRadius: 2 }}
          >
            Add New
          </Button>
        </Box>
      </Box>

      {/* Search toolbar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search records..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* DataGrid container */}
      <Paper sx={{ height: 620, width: '100%', borderRadius: 3.5, overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={finalColumns}
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
              bgcolor: theme.palette.mode === 'dark' ? '#0e1526' : '#f8fafc',
              borderBottom: `1px solid ${theme.palette.divider}`,
              fontWeight: 700,
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(79, 70, 229, 0.04)',
            },
          }}
        />
      </Paper>

      {/* Modal Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingData ? 'Edit' : 'Add New'} {title}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <FormComponent
            data={editingData}
            onSubmit={handleFormSubmit}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

