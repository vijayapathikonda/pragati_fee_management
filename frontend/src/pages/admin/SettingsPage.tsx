import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Tabs,
  Tab,
  Chip,
  Alert,
  Tooltip,
  CircularProgress,
  Divider,
  alpha,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { getSettings, updateSettings, triggerBackup } from '../../services/admin';
import { getLicenseStatus, uploadLicenseFile, LicenseInfo } from '../../services/license';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  const [schoolInfo, setSchoolInfo] = useState<any>({});
  const [formats, setFormats] = useState<any>({});
  const [smtp, setSmtp] = useState<any>({});
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [licenseMsg, setLicenseMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedServerId, setCopiedServerId] = useState(false);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const school = await getSettings('school_info');
    const f = await getSettings('formats');
    const s = await getSettings('smtp');
    setSchoolInfo(school);
    setFormats(f);
    setSmtp(s);
    try {
      const lic = await getLicenseStatus();
      setLicense(lic);
    } catch {}
  };

  const handleSave = async (group: string, data: any) => {
    setSaving(true);
    try {
      await updateSettings(group, data);
      alert('Settings saved successfully!');
    } catch (e) {
      alert('Failed to save settings.');
    }
    setSaving(false);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 850, mx: 'auto', pb: 6 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          System Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure institutional metadata, auto-number sequence formats, and communication gateways.
        </Typography>
      </Box>
      
      <Paper sx={{ width: '100%', borderRadius: 3.5, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
          <Tab label="School Info" sx={{ fontWeight: 600, textTransform: 'none' }} />
          <Tab label="Number Formats" sx={{ fontWeight: 600, textTransform: 'none' }} />
          <Tab label="SMTP Settings" sx={{ fontWeight: 600, textTransform: 'none' }} />
          <Tab label="Backup & Restore" sx={{ fontWeight: 600, textTransform: 'none' }} />
          <Tab label="License & Renewal" sx={{ fontWeight: 600, textTransform: 'none' }} />
        </Tabs>
        
        <TabPanel value={tab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField fullWidth label="School Name" value={schoolInfo.school_name || ''} onChange={(e) => setSchoolInfo({...schoolInfo, school_name: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Address" value={schoolInfo.school_address || ''} onChange={(e) => setSchoolInfo({...schoolInfo, school_address: e.target.value})} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" value={schoolInfo.school_phone || ''} onChange={(e) => setSchoolInfo({...schoolInfo, school_phone: e.target.value})} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" value={schoolInfo.school_email || ''} onChange={(e) => setSchoolInfo({...schoolInfo, school_email: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" disabled={saving} onClick={() => handleSave('school_info', schoolInfo)}>Save School Info</Button>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Use {'{YYYY}'} for year, {'{SEQ:4}'} for auto-incrementing number padded to 4 digits.
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Admission Number Format" value={formats.admission_number_format || ''} onChange={(e) => setFormats({...formats, admission_number_format: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Receipt Number Format" value={formats.receipt_number_format || ''} onChange={(e) => setFormats({...formats, receipt_number_format: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" disabled={saving} onClick={() => handleSave('formats', formats)}>Save Formats</Button>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="SMTP Host" value={smtp.smtp_host || ''} onChange={(e) => setSmtp({...smtp, smtp_host: e.target.value})} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="SMTP Port" value={smtp.smtp_port || ''} onChange={(e) => setSmtp({...smtp, smtp_port: e.target.value})} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="SMTP User" value={smtp.smtp_user || ''} onChange={(e) => setSmtp({...smtp, smtp_user: e.target.value})} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="password" label="SMTP Password" value={smtp.smtp_password || ''} onChange={(e) => setSmtp({...smtp, smtp_password: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" disabled={saving} onClick={() => handleSave('smtp', smtp)}>Save SMTP</Button>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tab} index={3}>
          <Typography variant="h6" gutterBottom>Database Backup</Typography>
          <Typography variant="body2" paragraph>
            For a full database SQL dump, please execute `mysqldump` directly on the Docker host machine. 
            However, you can use the button below to download a ZIP archive of all uploaded files (Student Photos and Generated PDF Receipts).
          </Typography>
          <Button variant="outlined" color="primary" onClick={triggerBackup}>
            Download Uploads Archive (.zip)
          </Button>
        </TabPanel>

        {/* Tab 4: License & Renewal */}
        <TabPanel value={tab} index={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {licenseMsg && (
              <Alert severity={licenseMsg.type} onClose={() => setLicenseMsg(null)}>
                {licenseMsg.text}
              </Alert>
            )}

            {/* License Overview Card */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? alpha('#1e293b', 0.6) : alpha('#f8fafc', 0.8),
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Institutional Software License
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25 }}>
                    {license?.school_name || 'No Active License'}
                  </Typography>
                </Box>
                <Chip
                  icon={
                    license?.status === 'ACTIVE' ? (
                      <VerifiedUserIcon fontSize="small" />
                    ) : license?.status === 'EXPIRING_SOON' ? (
                      <WarningAmberIcon fontSize="small" />
                    ) : (
                      <ErrorOutlineIcon fontSize="small" />
                    )
                  }
                  label={
                    license?.status === 'ACTIVE'
                      ? 'Active & Verified'
                      : license?.status === 'EXPIRING_SOON'
                      ? 'Expiring Soon'
                      : license?.status === 'EXPIRED'
                      ? 'Expired'
                      : 'Unlicensed'
                  }
                  color={
                    license?.status === 'ACTIVE'
                      ? 'success'
                      : license?.status === 'EXPIRING_SOON'
                      ? 'warning'
                      : 'error'
                  }
                  sx={{ fontWeight: 700, fontSize: '0.8rem', py: 0.5, px: 0.5 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={3}>
                {/* Expiry Date Card */}
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    EXPIRATION DATE
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: license?.status === 'EXPIRED' ? 'error.main' : 'text.primary', mt: 0.5 }}>
                    {license?.expires_at
                      ? new Date(license.expires_at).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Not Activated'}
                  </Typography>
                  {license?.expires_at && (
                    <Typography variant="caption" sx={{ color: license.days_remaining <= 30 ? 'warning.main' : 'success.main', fontWeight: 700 }}>
                      {license.days_remaining > 0 ? `${license.days_remaining} day(s) remaining` : 'Expired'}
                    </Typography>
                  )}
                </Grid>

                {/* Issued Date Card */}
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    ISSUED ON
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {license?.issued_at
                      ? new Date(license.issued_at).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Standard 1-Year Annual Term
                  </Typography>
                </Grid>

                {/* Operation Status */}
                <Grid item xs={12} sm={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    SYSTEM ACCESS MODE
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: license?.is_write_allowed ? 'success.main' : 'error.main' }}>
                    {license?.is_write_allowed ? 'Full Access (Read & Write)' : 'Restricted (Read-Only Mode)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {license?.is_write_allowed
                      ? 'Fee collections & admissions enabled'
                      : 'New payments and admissions disabled'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Server Hardware ID Card */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                Server Hardware Binding
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This software license is cryptographically bound to this physical machine / server to prevent unauthorized copying.
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  p: 1.75,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0f172a' : '#f1f5f9'),
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                    SERVER HARDWARE IDENTIFIER (MACHINE ID)
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: 1 }}>
                    {license?.current_server_id || 'Generating...'}
                  </Typography>
                </Box>
                <Tooltip title={copiedServerId ? 'Copied!' : 'Copy Server ID'} arrow>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={copiedServerId ? <CheckCircleIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    onClick={() => {
                      if (license?.current_server_id) {
                        navigator.clipboard.writeText(license.current_server_id);
                        setCopiedServerId(true);
                        setTimeout(() => setCopiedServerId(false), 2500);
                      }
                    }}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    {copiedServerId ? 'Copied' : 'Copy ID'}
                  </Button>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                When requesting a renewal, share this Server ID with your vendor to receive your signed <code>.lic</code> file.
              </Typography>
            </Paper>

            {/* Upload Renewal License File Card */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                Upload Renewal License File
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Select the cryptographically signed <code>.lic</code> file provided by your software provider to activate or renew.
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <input
                  id="settings-license-upload"
                  type="file"
                  accept=".lic,.json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setLicenseFile(e.target.files[0]);
                      setLicenseMsg(null);
                    }
                  }}
                />
                <label htmlFor="settings-license-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadFileIcon />}
                    sx={{ textTransform: 'none', borderRadius: 2, px: 2.5 }}
                  >
                    {licenseFile ? licenseFile.name : 'Choose .lic File'}
                  </Button>
                </label>

                <Button
                  variant="contained"
                  disabled={!licenseFile || uploadingLicense}
                  onClick={async () => {
                    if (!licenseFile) return;
                    setUploadingLicense(true);
                    setLicenseMsg(null);
                    try {
                      const res = await uploadLicenseFile(licenseFile);
                      setLicense(res.license);
                      setLicenseMsg({ type: 'success', text: res.message || 'License activated successfully!' });
                      setLicenseFile(null);
                    } catch (err: any) {
                      const msg = err.response?.data?.detail || err.message || 'Failed to upload license.';
                      setLicenseMsg({ type: 'error', text: msg });
                    } finally {
                      setUploadingLicense(false);
                    }
                  }}
                  startIcon={uploadingLicense && <CircularProgress size={16} color="inherit" />}
                  sx={{ textTransform: 'none', borderRadius: 2, px: 3 }}
                >
                  {uploadingLicense ? 'Activating...' : 'Activate / Renew License'}
                </Button>
              </Box>
            </Paper>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
