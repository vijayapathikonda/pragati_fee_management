import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, Chip, IconButton, Tooltip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getUsers, createUser, updateUser, deleteUser } from '../../services/user';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: 0, username: '', email: '', password: '', role_id: 2, is_active: true });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleOpen = (user?: any) => {
    if (user) {
      setEditMode(true);
      setFormData({ id: user.id, username: user.username, email: user.email, password: '', role_id: user.role_id, is_active: user.is_active });
    } else {
      setEditMode(false);
      setFormData({ id: 0, username: '', email: '', password: '', role_id: 2, is_active: true });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editMode) {
        await updateUser(formData.id, { is_active: formData.is_active, role_id: formData.role_id });
      } else {
        await createUser(formData);
      }
      setOpen(false);
      fetchUsers();
    } catch (e: any) {
      alert(e.response?.data?.detail || "An error occurred");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(id);
        fetchUsers();
      } catch (e: any) {
        alert(e.response?.data?.detail || "Cannot delete user");
      }
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'username',
      headerName: 'Username',
      width: 170,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'email', headerName: 'Email Address', width: 250 },
    {
      field: 'role_id',
      headerName: 'Role',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value === 1 ? 'Admin' : 'Cashier / Staff'}
          size="small"
          variant="outlined"
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            borderColor: params.value === 1 ? 'primary.main' : 'divider',
            color: params.value === 1 ? 'primary.main' : 'text.primary',
          }}
        />
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Disabled'}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            bgcolor: params.value ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: params.value ? '#059669' : '#dc2626',
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit User" arrow>
            <IconButton size="small" color="primary" onClick={() => handleOpen(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete User" arrow>
            <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: 1050, mx: 'auto', pb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Provision user accounts, assign roles, and configure system permissions.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: 2 }}>
          Add User
        </Button>
      </Box>
      
      <Paper sx={{ width: '100%', height: 600, borderRadius: 3.5, overflow: 'hidden' }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
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

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit User' : 'New User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField label="Username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} disabled={editMode} />
            <TextField label="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={editMode} />
            {!editMode && <TextField label="Password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />}
            <FormControl>
              <InputLabel>Role</InputLabel>
              <Select value={formData.role_id} label="Role" onChange={(e) => setFormData({...formData, role_id: e.target.value as number})}>
                <MenuItem value={1}>Super Admin</MenuItem>
                <MenuItem value={2}>Admin</MenuItem>
                <MenuItem value={3}>Staff</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />}
              label="Active Account"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
