import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { uploadLicenseFile, LicenseInfo } from '../../services/license';

interface Props {
  open: boolean;
  onClose: () => void;
  currentServerId: string;
  onLicenseActivated?: (info: LicenseInfo) => void;
}

export const LicenseUploadModal: React.FC<Props> = ({
  open,
  onClose,
  currentServerId,
  onLicenseActivated,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyServerId = () => {
    navigator.clipboard.writeText(currentServerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a .lic license file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await uploadLicenseFile(file);
      setSuccess(res.message || 'License activated successfully!');
      if (onLicenseActivated) {
        onLicenseActivated(res.license);
      }
      setTimeout(() => {
        onClose();
        setFile(null);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail || err.message || 'Failed to upload and activate license.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Activate / Renew License
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Server Hardware ID Banner */}
        <Box
          sx={{
            p: 2,
            mb: 3,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#131b2e' : '#f8fafc'),
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
            THIS SERVER HARDWARE ID
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>
              {currentServerId || 'Loading...'}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy Server ID'} arrow>
              <Button
                size="small"
                variant="outlined"
                startIcon={copied ? <CheckCircleIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                onClick={handleCopyServerId}
                sx={{ textTransform: 'none', py: 0.5, px: 1.5, borderRadius: 2 }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Tooltip>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Provide this Server ID to your software provider when requesting a new annual license.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2.5 }}>
            {success}
          </Alert>
        )}

        {/* File Dropzone / Picker */}
        <Box
          sx={{
            border: '2px dashed',
            borderColor: file ? 'primary.main' : 'divider',
            borderRadius: 3,
            p: 4,
            textAlign: 'center',
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc'),
            transition: 'border 0.2s ease',
          }}
        >
          <UploadFileIcon sx={{ fontSize: 44, color: file ? 'primary.main' : 'text.secondary', mb: 1 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {file ? file.name : 'Select your .lic license file'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Upload the cryptographically signed license file received from the vendor.
          </Typography>

          <input
            id="license-file-input"
            type="file"
            accept=".lic,.json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <label htmlFor="license-file-input">
            <Button variant="contained" component="span" sx={{ textTransform: 'none', borderRadius: 2, px: 3 }}>
              {file ? 'Change File' : 'Browse File (.lic)'}
            </Button>
          </label>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} disabled={loading} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || loading}
          startIcon={loading && <CircularProgress size={16} color="inherit" />}
          sx={{ textTransform: 'none', px: 3, borderRadius: 2 }}
        >
          {loading ? 'Activating...' : 'Activate License'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default LicenseUploadModal;
