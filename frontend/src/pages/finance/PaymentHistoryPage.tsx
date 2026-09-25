import { useState, useEffect } from 'react';
import {
  Box, Button, Paper, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Tooltip
} from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { getStudentReceipts, cancelReceipt, sendReceiptWhatsApp } from '../../services/payment';
import StudentSelector from '../../components/StudentSelector';
import { getFileUrl } from '../../services/api';

export default function PaymentHistoryPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [receipts, setReceipts] = useState<any[]>([]);

  useEffect(() => {
    if (selectedStudentId) {
      loadReceipts();
    } else {
      setReceipts([]);
    }
  }, [selectedStudentId]);

  const loadReceipts = () => {
    getStudentReceipts(Number(selectedStudentId)).then(setReceipts).catch(console.error);
  };

  const handleDownload = (pdfPath: string) => {
    window.open(getFileUrl(pdfPath), '_blank');
  };

  const handleSendWhatsApp = async (receipt: any) => {
    try {
      // Trigger backend WhatsApp service (sends via Cloud API / Gateway if configured, and returns fresh wa.me link)
      const res = await sendReceiptWhatsApp(receipt.id);
      if (res.whatsapp_sent) {
        alert(`WhatsApp receipt & PDF sent automatically from School WhatsApp to ${res.recipient_name || 'Mother'} (${res.recipient_phone}).`);
      } else if (res.whatsapp_url) {
        window.open(res.whatsapp_url, '_blank');
      } else if (receipt.whatsapp_url) {
        window.open(receipt.whatsapp_url, '_blank');
      } else {
        const manualPhone = window.prompt("Mother Contact Number is not set for this student. Enter 10-digit WhatsApp number to send receipt:");
        if (manualPhone && manualPhone.trim()) {
          const retryRes = await sendReceiptWhatsApp(receipt.id, manualPhone.trim());
          if (retryRes.whatsapp_sent) {
            alert(`WhatsApp receipt sent to ${retryRes.recipient_phone}.`);
          } else if (retryRes.whatsapp_url) {
            window.open(retryRes.whatsapp_url, '_blank');
          }
        }
      }
    } catch (error: any) {
      if (receipt.whatsapp_url) {
        window.open(receipt.whatsapp_url, '_blank');
      } else {
        alert(error.response?.data?.detail || "Failed to send WhatsApp notification");
      }
    }
  };

  const handleCancel = async (receiptId: number) => {
    const reason = window.prompt("Enter reason for cancellation:");
    if (reason) {
      try {
        await cancelReceipt(receiptId, reason);
        alert("Receipt cancelled successfully. Balances have been reverted.");
        loadReceipts();
      } catch (error: any) {
        alert(error.response?.data?.detail || "Failed to cancel receipt");
      }
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto', pb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Payment History & Receipts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track transaction ledgers, audit issued receipts, download PDF vouchers, and send receipts to Mother's WhatsApp.
        </Typography>
      </Box>
      
      {/* Student Selector Card */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary' }}>
          Select Student
        </Typography>
        <StudentSelector 
          selectedStudentId={selectedStudentId} 
          onStudentSelect={(id) => setSelectedStudentId(id === '' ? '' : Number(id))} 
        />
      </Paper>

      {selectedStudentId && (
        <Paper sx={{ p: 3, borderRadius: 3.5 }}>
          {receipts.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography color="text.secondary">No payment receipts found for this student.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction Date</TableCell>
                    <TableCell>Receipt Number</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Mother Contact (WhatsApp)</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id} hover sx={{ transition: 'background-color 0.15s ease' }}>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                        {receipt.created_at}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'primary.main' }}>
                        {receipt.receipt_number}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>₹{receipt.total_amount}</TableCell>
                      <TableCell sx={{ fontSize: '0.825rem' }}>
                        {receipt.mother_contact_number || receipt.recipient_phone ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                              {receipt.mother_name || receipt.recipient_name || 'Mother'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {receipt.mother_contact_number || receipt.recipient_phone}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">Not Set</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={receipt.status} 
                          size="small" 
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            bgcolor: receipt.status === 'Success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: receipt.status === 'Success' ? '#059669' : '#dc2626',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {receipt.pdf_path && receipt.status === 'Success' && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PictureAsPdfOutlinedIcon fontSize="small" />}
                            onClick={() => handleDownload(receipt.pdf_path)}
                            sx={{ mr: 1, borderRadius: 2 }}
                          >
                            PDF
                          </Button>
                        )}
                        {receipt.status === 'Success' && (
                          <Tooltip title={`Send Receipt & PDF on WhatsApp to ${receipt.mother_name || 'Mother'} (${receipt.mother_contact_number || receipt.recipient_phone || 'Enter Phone'})`} arrow>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<WhatsAppIcon fontSize="small" />}
                              onClick={() => handleSendWhatsApp(receipt)}
                              sx={{
                                mr: 1,
                                borderRadius: 2,
                                color: '#16a34a',
                                borderColor: 'rgba(22, 163, 74, 0.45)',
                                '&:hover': {
                                  bgcolor: 'rgba(22, 163, 74, 0.08)',
                                  borderColor: '#16a34a'
                                }
                              }}
                            >
                              WhatsApp
                            </Button>
                          </Tooltip>
                        )}
                        {receipt.status === 'Success' && (
                          <Tooltip title="Cancel Receipt & Revert Balance" arrow>
                            <Button
                              size="small"
                              color="error"
                              variant="text"
                              startIcon={<BlockOutlinedIcon fontSize="small" />}
                              onClick={() => handleCancel(receipt.id)}
                              sx={{ borderRadius: 2 }}
                            >
                              Cancel
                            </Button>
                          </Tooltip>
                        )}
                        {receipt.status === 'Cancelled' && receipt.cancellation_reason && (
                          <Typography variant="caption" color="error" display="block">
                            Reason: {receipt.cancellation_reason}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
}

