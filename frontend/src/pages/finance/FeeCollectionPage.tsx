import { useState, useEffect } from 'react';
import {
  Box, Button, Paper, Typography, Grid,
  MenuItem, Select, FormControl, InputLabel, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Chip
} from '@mui/material';
import api, { getFileUrl } from '../../services/api';
import { getStudentFees } from '../../services/fee';
import { collectFee } from '../../services/payment';
import StudentSelector from '../../components/StudentSelector';

export default function FeeCollectionPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [outstandingFees, setOutstandingFees] = useState<any[]>([]);
  
  const [paymentModes, setPaymentModes] = useState<any[]>([]);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<number | ''>('');
  const [transactionRef, setTransactionRef] = useState('');
  
  // State for tracking which fees are selected for payment and how much
  const [paymentInputs, setPaymentInputs] = useState<Record<number, { selected: boolean, amount: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get('/masters/payment-modes').then(res => setPaymentModes(res.data.data));
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadOutstandingFees();
    } else {
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
      items: items
    };

    setIsSubmitting(true);
    try {
      const receipt = await collectFee(payload);
      alert(`Payment successful! Receipt No: ${receipt.receipt_number}`);
      
      // Auto download PDF
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
          Process student fee settlements, verify balances, and issue instant receipts.
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
                      <TableCell align="right">₹{fee.net_amount}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>₹{fee.paid_amount}</TableCell>
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
    </Box>
  );
}
