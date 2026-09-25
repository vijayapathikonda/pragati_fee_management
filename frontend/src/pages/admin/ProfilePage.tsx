import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, Grid, Alert, Avatar } from '@mui/material';
import { changePassword } from '../../services/user';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [passData, setPassData] = useState({ old_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState({ text: '', type: 'info' });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      setUser(JSON.parse(u));
    }
  }, []);

  const handlePasswordChange = async () => {
    if (passData.new_password !== passData.confirm) {
      setMsg({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    
    try {
      await changePassword({ old_password: passData.old_password, new_password: passData.new_password });
      setMsg({ text: 'Password updated successfully!', type: 'success' });
      setPassData({ old_password: '', new_password: '', confirm: '' });
    } catch (e: any) {
      setMsg({ text: e.response?.data?.detail || 'Failed to update password', type: 'error' });
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto', pb: 6 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          My Account Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your personal account credentials and security preferences.
        </Typography>
      </Box>
      
      {/* User Overview Card */}
      <Paper sx={{ p: 3.5, mb: 3, borderRadius: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              fontSize: '1.4rem',
              fontWeight: 700,
            }}
          >
            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{user.username}</Typography>
            <Typography variant="body2" color="text.secondary">{user.email}</Typography>
          </Box>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Username" value={user.username} disabled />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Email Address" value={user.email} disabled />
          </Grid>
        </Grid>
      </Paper>

      {/* Security Card */}
      <Paper sx={{ p: 3.5, borderRadius: 3.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Security & Password</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Update your administrative login password regularly for account security.
        </Typography>
        {msg.text && <Alert severity={msg.type as any} sx={{ mb: 2.5, borderRadius: 2 }}>{msg.text}</Alert>}
        
        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <TextField fullWidth type="password" label="Current Password" value={passData.old_password} onChange={(e) => setPassData({...passData, old_password: e.target.value})} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="password" label="New Password" value={passData.new_password} onChange={(e) => setPassData({...passData, new_password: e.target.value})} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="password" label="Confirm New Password" value={passData.confirm} onChange={(e) => setPassData({...passData, confirm: e.target.value})} />
          </Grid>
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handlePasswordChange}
              disabled={!passData.old_password || !passData.new_password}
              sx={{ borderRadius: 2, px: 3 }}
            >
              Update Password
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
