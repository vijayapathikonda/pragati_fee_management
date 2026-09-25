import { useState, useEffect } from 'react';
import {
  Box, Button, Paper, Typography, Grid,
  MenuItem, Select, FormControl, InputLabel, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Chip, FormControlLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Divider
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import api, { getFileUrl } from '../../services/api';
import { getStudentFees } from '../../services/fee';
import { getStudentById } from '../../services/student';
import { collectFee } from '../../services/payment';
import StudentSelector from '../../components/StudentSelector';

export default function FeeCollectionPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [studentInfo, setStudentInfo] = useState<any | null>(null);
  const [outstandingFees, setOutstandingFees] = useState<any[]>([]);
  
  const [paymentModes, setPaymentModes] = useState<any[]>([]);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<number | ''>('');
  const [transactionRef, setTransactionRef] = useState('');
  
  // WhatsApp notification state (targets Mother contact number by default)
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [motherPhone, setMotherPhone] = useState<string>('');
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);
  
  // State for tracking which fees are selected for payment and how much
  const [paymentInputs, setPaymentInputs] = useState<Record<number, { selected: boolean, amount: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get('/masters/payment-modes').then(res => setPaymentModes(res.data.data));
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadOutstandingFees();
      getStudentById(Number(selectedStudentId))
        .then(stu => {
          setStudentInfo(stu);
          const preferredPhone = stu?.mother_contact_number || stu?.father_contact_number || stu?.contact_number || '';
          setMotherPhone(preferredPhone);
        })
        .catch(() => {
          setStudentInfo(null);
          setMotherPhone('');
        });
    } else {
      setStudentInfo(null);
      setMotherPhone('');
      setOutstandingFees([]);
      setPaymentInputs({});
    }
  }, [selectedStudentId]);

  const loadOutstandingFees = () => {
    getStudentFees(Number(selectedStudentId)).then(res => {
      // Filter out PAID fees
      const pending = res.assignments.filter((f: any) => f.status !== 'Paid');
      setOutstandingFees(pending);
      
      const inputs: any = {};
      pending.forEach((f: any) => {
        const outstandingAmount = f.net_amount - f.paid_amount;
        inputs[f.id] = { selected: false, amount: outstandingAmount.toFixed(2) };
      });
      setPaymentInputs(inputs);
    });
  };

  const handleCheckboxChange = (feeId: number, checked: boolean) => {
    setPaymentInputs(prev => ({
      ...prev,
      [feeId]: { ...prev[feeId], selected: checked }
    }));
  };

  const handleAmountChange = (feeId: number, value: string) => {
    setPaymentInputs(prev => ({
      ...prev,
      [feeId]: { ...prev[feeId], amount: value }
    }));
  };

  const getTotalPaying = () => {
    let total = 0;
    Object.values(paymentInputs).forEach(input => {
      if (input.selected) {
        total += parseFloat(input.amount || '0');
      }
    });
    return total;
  };

  const handleSubmit = async () => {
    if (!selectedPaymentMode) {
      alert("Please select a payment mode");
      return;
    }

    const selectedMode = paymentModes.find(m => m.id === selectedPaymentMode);
    if (selectedMode && selectedMode.name !== 'Cash' && !transactionRef.trim()) {
      alert(`Please enter a transaction reference (e.g. UPI ID, Cheque No) for ${selectedMode.name} payment.`);
      return;
    }

    const items = [];
    for (const [feeId, input] of Object.entries(paymentInputs)) {
      if (input.selected && parseFloat(input.amount) > 0) {
        items.push({
          fee_assignment_id: Number(feeId),
          amount_paid: parseFloat(input.amount)
        });
      }
    }

    if (items.length === 0) {
      alert("Please select at least one fee to pay");
      return;
    }

    const payload = {
      student_id: selectedStudentId,
      payment_mode_id: selectedPaymentMode,
      transaction_reference: transactionRef,
      items: items,
      send_whatsapp: sendWhatsApp,
      mother_phone_override: motherPhone.trim() || undefined
    };

    setIsSubmitting(true);
    try {
      const receipt = await collectFee(payload);
      setLastReceipt(receipt);
      
      // Auto open PDF receipt in a new tab
      if (receipt.pdf_path) {
        window.open(getFileUrl(receipt.pdf_path), '_blank');
      }
      
      // Reset form
      setTransactionRef('');
      setSelectedPaymentMode('');
      loadOutstandingFees();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto', pb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Fee Collection Terminal (POS)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Process student fee settlements, verify balances, issue 2-in-1 A4 receipts, and notify Mother on WhatsApp.
        </Typography>
      </Box>

      {/* Student Selection Card */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary' }}>
          Select Student
        </Typography>
        <StudentSelector 
          selectedStudentId={selectedStudentId} 
          onStudentSelect={(id) => setSelectedStudentId(id === '' ? '' : Number(id))} 
        />
        {studentInfo && (
          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed rgba(0,0,0,0.1)', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Chip
              icon={<WhatsAppIcon sx={{ color: '#16a34a !important' }} />}
              label={`Mother: ${studentInfo.mother_name || 'N/A'} (${studentInfo.mother_contact_number || 'No Mother Contact Set'})`}
              size="small"
              sx={{ bgcolor: 'rgba(22, 163, 74, 0.08)', color: '#15803d', fontWeight: 600 }}
            />
            {studentInfo.father_name && (
              <Typography variant="caption" color="text.secondary">
                Father: <strong>{studentInfo.father_name}</strong> ({studentInfo.father_contact_number || 'N/A'})
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* Outstanding Dues Table */}
      {selectedStudentId && outstandingFees.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Outstanding Fee Items</Typography>
              <Typography variant="caption" color="text.secondary">
                Select items to include in this transaction receipt
              </Typography>
            </Box>
            <Chip 
              label={`${outstandingFees.length} Pending`} 
              size="small" 
              sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main', fontWeight: 700 }} 
            />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox"></TableCell>
                  <TableCell>Fee Head / Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Base Fee</TableCell>
                  <TableCell align="right">Discount</TableCell>
                  <TableCell align="right">Net Due</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell align="right" width="160">Paying Now (₹)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {outstandingFees.map((fee) => {
                  const balance = (fee.net_amount - fee.paid_amount).toFixed(2);
                  const isSelected = paymentInputs[fee.id]?.selected || false;
                  const discAmt = Number(fee.discount_amount || 0);
                  return (
                    <TableRow 
                      key={fee.id} 
                      selected={isSelected}
                      hover
                      sx={{ transition: 'background-color 0.15s ease' }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox 
                          color="primary"
                          checked={isSelected}
                          onChange={(e) => handleCheckboxChange(fee.id, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{fee.description}</TableCell>
                      <TableCell>
                        <Chip label={fee.fee_category?.name || 'Standard'} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                      </TableCell>
                      <TableCell align="right">₹{Number(fee.base_amount || fee.net_amount).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right" sx={{ color: discAmt > 0 ? 'warning.dark' : 'text.disabled', fontWeight: discAmt > 0 ? 700 : 400 }}>
                        {discAmt > 0 ? `-₹${discAmt.toLocaleString('en-IN')} (${fee.discount_type?.name || 'Disc'})` : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>₹{Number(fee.net_amount).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>₹{Number(fee.paid_amount).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>₹{balance}</TableCell>
                      <TableCell align="right">
                        <TextField 
                          size="small"
                          type="number"
                          inputProps={{ max: balance, step: "0.01", min: "0.01" }}
                          value={paymentInputs[fee.id]?.amount || ''}
                          onChange={(e) => handleAmountChange(fee.id, e.target.value)}
                          disabled={!isSelected}
                          sx={{ width: 140 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {selectedStudentId && outstandingFees.length === 0 && (
        <Paper sx={{ p: 4, mb: 3, textAlign: 'center', borderRadius: 3.5, bgcolor: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <Typography color="success.main" variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            No Outstanding Dues
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This student has fully settled all assigned fees for the active term.
          </Typography>
        </Paper>
      )}

      {/* POS Checkout Summary Bar */}
      {getTotalPaying() > 0 && (
        <Paper 
          sx={{ 
            p: 3.5, 
            borderRadius: 3.5,
            border: '1.5px solid',
            borderColor: 'primary.main',
            boxShadow: '0 8px 30px rgba(79, 70, 229, 0.12)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Payment Summary & Checkout
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Total Payable Amount
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
                ₹{getTotalPaying().toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Channel</InputLabel>
                <Select
                  value={selectedPaymentMode}
                  label="Payment Channel"
                  onChange={(e) => setSelectedPaymentMode(e.target.value as number)}
                >
                  {paymentModes.map(m => (
                    <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField 
                size="small" 
                fullWidth 
                label={
                  paymentModes.find(m => m.id === selectedPaymentMode)?.name === 'Cash' 
                    ? "Transaction Reference (Optional)" 
                    : "UPI ID / Cheque / UTR No. *"
                }
                required={paymentModes.find(m => m.id === selectedPaymentMode)?.name !== 'Cash'}
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </Grid>

            {/* WhatsApp Mother Notification Bar */}
            <Grid item xs={12}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(22, 163, 74, 0.04)',
                  borderColor: 'rgba(22, 163, 74, 0.25)',
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={7}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={sendWhatsApp}
                          onChange={(e) => setSendWhatsApp(e.target.checked)}
                          sx={{ color: '#16a34a', '&.Mui-checked': { color: '#16a34a' } }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <WhatsAppIcon fontSize="small" />
                            Send Payment Receipt & PDF on WhatsApp to Mother
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Automatically sends receipt summary & PDF link to Mother ({studentInfo?.mother_name || 'Mother Contact'})
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Mother WhatsApp Number"
                      placeholder="10-digit mobile number"
                      value={motherPhone}
                      disabled={!sendWhatsApp}
                      onChange={(e) => setMotherPhone(e.target.value)}
                      helperText={
                        !studentInfo?.mother_contact_number && motherPhone
                          ? "Using fallback parent contact (editable)"
                          : "Mother's WhatsApp contact number"
                      }
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button 
                variant="contained" 
                color="primary" 
                size="large"
                onClick={handleSubmit}
                disabled={isSubmitting}
                sx={{ px: 4, py: 1.25, fontWeight: 700, borderRadius: 2.5 }}
              >
                {isSubmitting ? 'Processing Transaction...' : 'Collect & Generate Official Receipt'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Payment Success & WhatsApp Receipt Dispatch Modal */}
      <Dialog
        open={Boolean(lastReceipt)}
        onClose={() => setLastReceipt(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: 'success.main' }}>
          <CheckCircleOutlineIcon color="success" />
          Payment Collected — Receipt {lastReceipt?.receipt_number}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Official 2-in-1 A4 Receipt (Parent Slip + School Slip) has been generated.
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
              Amount Paid: ₹{Number(lastReceipt?.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <WhatsAppIcon sx={{ color: '#16a34a' }} fontSize="small" />
            Mother WhatsApp Notification
          </Typography>

          {lastReceipt?.whatsapp_sent ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Receipt message & PDF have been automatically dispatched from the School WhatsApp account to{' '}
              <strong>{lastReceipt.recipient_name || 'Mother'}</strong> ({lastReceipt.recipient_phone}).
            </Alert>
          ) : lastReceipt?.whatsapp_url ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Ready to send to <strong>{lastReceipt.recipient_name || 'Mother'}</strong> ({lastReceipt.recipient_phone}).
              Click <strong>"Send on WhatsApp to Mother"</strong> below to open WhatsApp with the pre-filled receipt & PDF link.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No Mother / Parent phone number was found for this student. Please update the student's Mother Contact Number in Student Directory.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {lastReceipt?.pdf_path && (
              <Button
                variant="outlined"
                startIcon={<PictureAsPdfOutlinedIcon />}
                onClick={() => window.open(getFileUrl(lastReceipt.pdf_path), '_blank')}
              >
                View / Print PDF
              </Button>
            )}
            {lastReceipt?.whatsapp_url && (
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={() => window.open(lastReceipt.whatsapp_url, '_blank')}
                sx={{
                  bgcolor: '#16a34a',
                  '&:hover': { bgcolor: '#15803d' },
                  fontWeight: 700,
                }}
              >
                Send on WhatsApp to Mother
              </Button>
            )}
          </Box>
          <Button onClick={() => setLastReceipt(null)} sx={{ fontWeight: 700 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

