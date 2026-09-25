import { useState, useEffect } from 'react';
import {
  Box, Button, Paper, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Tooltip
} from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { getStudentReceipts, cancelReceipt } from '../../services/payment';
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
          Track transaction ledgers, audit issued receipts, and download PDF vouchers.
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
