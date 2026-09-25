import React, { useState } from 'react';
import { Box, Alert, Button, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import KeyIcon from '@mui/icons-material/Key';
import { LicenseInfo } from '../../services/license';
import LicenseUploadModal from './LicenseUploadModal';

interface Props {
  license: LicenseInfo | null;
  onLicenseRenewed: (info: LicenseInfo) => void;
}

export const LicenseBanner: React.FC<Props> = ({ license, onLicenseRenewed }) => {
  const [modalOpen, setModalOpen] = useState(false);

  if (!license) return null;

  const { status, days_remaining, expires_at, current_server_id } = license;

  // If ACTIVE (> 30 days remaining), do not show intrusive top banner
  if (status === 'ACTIVE') return null;

  const formattedDate = expires_at
    ? new Date(expires_at).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  let severity: 'warning' | 'error' = 'warning';
  let title = '';
  let description = '';

  if (status === 'EXPIRING_SOON') {
    severity = 'warning';
    title = `Annual License Expiring in ${days_remaining} Day${days_remaining === 1 ? '' : 's'}`;
    description = `Your institutional license is scheduled to expire on ${formattedDate}. Please obtain a renewal license file from your provider to ensure uninterrupted fee processing.`;
  } else if (status === 'EXPIRED') {
    severity = 'error';
    title = `Software License Expired on ${formattedDate}`;
    description = `The annual license period has elapsed. The system is operating in Read-Only mode. New fee collection, student enrollment, and financial modifications are currently disabled until renewed.`;
  } else if (status === 'TAMPERED') {
    severity = 'error';
    title = `License Validation Anomaly`;
    description = license.message || `The cryptographic signature or system clock integrity check failed. Please re-upload a valid license file to restore full administrative access.`;
  } else if (status === 'UNLICENSED') {
    severity = 'error';
    title = `Server Unlicensed`;
    description = license.message || `No active license was detected on this server. Please upload your .lic license file to activate the software.`;
  }

  return (
    <>
      <Box sx={{ mb: 2.5 }}>
        <Alert
          severity={severity}
          icon={severity === 'error' ? <ErrorOutlineIcon fontSize="inherit" /> : <WarningAmberIcon fontSize="inherit" />}
          action={
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              startIcon={<KeyIcon />}
              onClick={() => setModalOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                borderColor: 'currentColor',
                whiteSpace: 'nowrap',
                ml: 1,
              }}
            >
              {status === 'EXPIRING_SOON' ? 'Renew License' : 'Activate License'}
            </Button>
          }
          sx={{
            borderRadius: 2.5,
            alignItems: 'center',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.85rem', mt: 0.25 }}>
            {description}
          </Typography>
        </Alert>
      </Box>

      <LicenseUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentServerId={current_server_id}
        onLicenseActivated={(updated) => {
          onLicenseRenewed(updated);
        }}
      />
    </>
  );
};
export default LicenseBanner;
