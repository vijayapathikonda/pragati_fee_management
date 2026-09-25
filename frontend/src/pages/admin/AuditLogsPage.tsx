import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getAuditLogs } from '../../services/admin';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(0, 1000);
      setLogs(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const columns: GridColDef[] = [
    { field: 'timestamp', headerName: 'Timestamp', width: 190, valueFormatter: (value) => value ? new Date(value as string).toLocaleString() : '' },
    {
      field: 'username',
      headerName: 'User',
      width: 140,
      renderCell: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.value || 'System'}</Typography>
      ),
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 130,
      renderCell: (p) => (
        <Chip
          label={p.value}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
        />
      ),
    },
    { field: 'resource', headerName: 'Resource', width: 180 },
    { field: 'ip_address', headerName: 'IP Address', width: 140, renderCell: (p) => <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.value || '-'}</span> },
    { field: 'details', headerName: 'Details', flex: 1 },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: 1300, mx: 'auto', pb: 6 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          System Audit Logs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track security events, user operations, and historical system transactions.
        </Typography>
      </Box>
      <Paper sx={{ width: '100%', height: 680, borderRadius: 3.5, overflow: 'hidden' }}>
        <DataGrid
          rows={logs}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          density="compact"
          initialState={{
            sorting: { sortModel: [{ field: 'timestamp', sort: 'desc' }] },
          }}
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
