import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box, Button, Paper, TextField, Typography, Grid,
  MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Card, Divider, IconButton, Chip, Tooltip,
  Tabs, Tab, Checkbox, FormControlLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, InputAdornment, Alert, CircularProgress
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import SearchIcon from '@mui/icons-material/Search';
import SchoolIcon from '@mui/icons-material/School';
import api from '../../services/api';
import {
  getStudentFees, createFeeAssignment, deleteFeeAssignment, updateFeeAssignment,
  getGradeFeeStatus, batchAssignFees
} from '../../services/fee';
import StudentSelector from '../../components/StudentSelector';

interface StudentRosterItem {
  student_id: number;
  admission_number: string;
  roll_number: string | null;
  first_name: string;
  last_name: string;
  section_name: string | null;
  photo_url: string;
  is_assigned: boolean;
  assignment_id: number | null;
  base_amount: number;
  discount_type_id: number | '';
  net_amount: number;
  paid_amount: number;
  status: string | null;
  due_date: string | null;
  is_selected: boolean;
}

export default function FeeAssignmentPage() {
  const [activeTab, setActiveTab] = useState<number>(0);

  // Master Data
  const [categories, setCategories] = useState<any[]>([]);
  const [discountTypes, setDiscountTypes] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);

  // -------------------------------------------------------------
  // TAB 0: GRADE-LEVEL BATCH ASSIGNMENT STATE
  // -------------------------------------------------------------
  const [batchYearId, setBatchYearId] = useState<number | ''>('');
  const [batchGradeId, setBatchGradeId] = useState<number | ''>(1); // Default Grade 1
  const [batchCategoryId, setBatchCategoryId] = useState<number | ''>('');
  const [commonAmount, setCommonAmount] = useState<string>('45000');
  const [batchDescription, setBatchDescription] = useState<string>('');
  const [batchDueDate, setBatchDueDate] = useState<string>('');
  const [updateExisting, setUpdateExisting] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
  const [submittingBatch, setSubmittingBatch] = useState<boolean>(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<any | null>(null);

  // -------------------------------------------------------------
  // TAB 1: INDIVIDUAL STUDENT ASSIGNMENT STATE
  // -------------------------------------------------------------
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [feeData, setFeeData] = useState<{ summary: any, assignments: any[] } | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);

  const { register, handleSubmit, reset } = useForm();
  const { register: registerEdit, handleSubmit: handleEditSubmitWrapper, reset: resetEdit } = useForm();

  // Load Masters
  useEffect(() => {
    api.get('/masters/fee-categories?size=100').then(res => {
      const cats = res.data.data || [];
      setCategories(cats);
      if (cats.length > 0) {
        // Default to Tuition Fee if present
        const tuition = cats.find((c: any) => c.name.toLowerCase().includes('tution') || c.name.toLowerCase().includes('tuition'));
        setBatchCategoryId(tuition ? tuition.id : cats[0].id);
      }
    });

    api.get('/masters/discount-types?size=100').then(res => setDiscountTypes(res.data.data || []));

    api.get('/masters/academic-years?size=100&sort_by=id&sort_order=asc').then(res => {
      const ays = res.data.data || [];
      setAcademicYears(ays);
      const active = ays.find((a: any) => a.is_active);
      if (active) setBatchYearId(active.id);
      else if (ays.length > 0) setBatchYearId(ays[ays.length - 1].id);
    });

    api.get('/masters/grades?size=100&sort_by=id&sort_order=asc').then(res => {
      const gList = res.data.data || [];
      setGrades(gList);
      if (gList.length > 0) setBatchGradeId(gList[0].id);
    });

    // Default Due Date: 30 days from today
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setBatchDueDate(d.toISOString().split('T')[0]);
  }, []);

  // Update auto-description when grade, category, or year changes
  useEffect(() => {
    const cat = categories.find(c => c.id === batchCategoryId);
    const gr = grades.find(g => g.id === batchGradeId);
    const yr = academicYears.find(y => y.id === batchYearId);
    if (cat && gr) {
      setBatchDescription(`${cat.name} - ${gr.name} (${yr?.name || ''})`.trim());
    }
  }, [batchCategoryId, batchGradeId, batchYearId, categories, grades, academicYears]);

  // Load Roster for Batch Assignment
  const loadBatchRoster = async () => {
    if (!batchYearId || !batchGradeId || !batchCategoryId) return;
    setLoadingRoster(true);
    try {
      const data = await getGradeFeeStatus(Number(batchYearId), Number(batchGradeId), Number(batchCategoryId));
      const defaultAmtNum = parseFloat(commonAmount) || 0;

      const mapped: StudentRosterItem[] = data.map((item: any) => {
        const baseAmt = item.is_assigned && item.base_amount != null ? Number(item.base_amount) : defaultAmtNum;
        return {
          student_id: item.student_id,
          admission_number: item.admission_number,
          roll_number: item.roll_number,
          first_name: item.first_name,
          last_name: item.last_name || '',
          section_name: item.section_name,
          photo_url: item.photo_url || `/students/student_${item.student_id}.jpeg`,
          is_assigned: item.is_assigned,
          assignment_id: item.assignment_id,
          base_amount: baseAmt,
          discount_type_id: '',
          net_amount: baseAmt,
          paid_amount: item.paid_amount ? Number(item.paid_amount) : 0,
          status: item.status,
          due_date: item.due_date,
          // Uncheck by default if already assigned or paid, check if not assigned
          is_selected: !item.is_assigned,
        };
      });
      setRoster(mapped);
    } catch (err) {
      console.error('Failed to load grade fee status:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (activeTab === 0 && batchYearId && batchGradeId && batchCategoryId) {
      loadBatchRoster();
    }
  }, [activeTab, batchYearId, batchGradeId, batchCategoryId]);

  // Calculate discount helper
  const calculateNet = (base: number, discId: number | '') => {
    if (!discId) return base;
    const disc = discountTypes.find(d => d.id === discId);
    if (!disc) return base;
    let discAmt = 0;
    if (disc.percentage) {
      discAmt = (base * Number(disc.percentage)) / 100;
    } else if (disc.flat_amount) {
      discAmt = Number(disc.flat_amount);
    }
    discAmt = Math.min(discAmt, base);
    return Math.max(0, base - discAmt);
  };

  // Student Amount Change Handler
  const handleAmountChange = (studentId: number, val: string) => {
    const num = parseFloat(val) || 0;
    setRoster(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return { ...s, base_amount: num, net_amount: calculateNet(num, s.discount_type_id) };
      }
      return s;
    }));
  };

  // Student Discount Change Handler
  const handleDiscountChange = (studentId: number, discId: number | '') => {
    setRoster(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return { ...s, discount_type_id: discId, net_amount: calculateNet(s.base_amount, discId) };
      }
      return s;
    }));
  };

  // Student Checkbox Toggle
  const handleToggleStudent = (studentId: number) => {
    setRoster(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return { ...s, is_selected: !s.is_selected };
      }
      return s;
    }));
  };

  // Apply Common Amount to All Selected
  const handleApplyCommonAmount = () => {
    const num = parseFloat(commonAmount) || 0;
    setRoster(prev => prev.map(s => {
      if (s.is_selected) {
        return { ...s, base_amount: num, net_amount: calculateNet(num, s.discount_type_id) };
      }
      return s;
    }));
  };

  // Select / Deselect Filters
  const handleSelectAll = (select: boolean) => {
    setRoster(prev => prev.map(s => ({ ...s, is_selected: select })));
  };

  const handleSelectOnlyUnassigned = () => {
    setRoster(prev => prev.map(s => ({ ...s, is_selected: !s.is_assigned })));
  };

  // Filtered roster for search
  const filteredRoster = useMemo(() => {
    if (!searchFilter.trim()) return roster;
    const query = searchFilter.toLowerCase();
    return roster.filter(s =>
      s.first_name.toLowerCase().includes(query) ||
      s.last_name.toLowerCase().includes(query) ||
      s.admission_number.toLowerCase().includes(query) ||
      (s.roll_number && s.roll_number.includes(query))
    );
  }, [roster, searchFilter]);

  // Batch KPI calculations
  const totalStudents = roster.length;
  const selectedStudents = roster.filter(s => s.is_selected);
  const selectedCount = selectedStudents.length;
  const alreadyAssignedCount = roster.filter(s => s.is_assigned).length;
  const totalBatchAmount = selectedStudents.reduce((sum, s) => sum + s.net_amount, 0);

  // Submit Batch Fee Assignment
  const handleExecuteBatchAssign = async () => {
    setSubmittingBatch(true);
    try {
      const payload = {
        academic_year_id: Number(batchYearId),
        grade_id: Number(batchGradeId),
        fee_category_id: Number(batchCategoryId),
        description: batchDescription,
        due_date: batchDueDate,
        update_existing: updateExisting,
        items: roster.map(s => ({
          student_id: s.student_id,
          base_amount: s.base_amount,
          discount_type_id: s.discount_type_id || null,
          is_selected: s.is_selected,
        })),
      };

      const res = await batchAssignFees(payload);
      setBatchResult(res);
      setConfirmDialogOpen(false);
      // Reload roster to reflect new assignments
      loadBatchRoster();
    } catch (err: any) {
      console.error('Batch assignment failed:', err);
      alert(err.response?.data?.detail || 'Failed to execute batch fee assignment.');
    } finally {
      setSubmittingBatch(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 1: INDIVIDUAL ASSIGNMENT LOGIC
  // -------------------------------------------------------------
  useEffect(() => {
    if (selectedStudentId) {
      loadFeeData();
    } else {
      setFeeData(null);
    }
  }, [selectedStudentId]);

  const loadFeeData = () => {
    if (selectedStudentId) {
      getStudentFees(Number(selectedStudentId)).then(setFeeData).catch(console.error);
    }
  };

  const handleAssignSubmit = async (data: any) => {
    try {
      const payload = {
        student_id: selectedStudentId,
        academic_year_id: data.academic_year_id,
        fee_category_id: data.fee_category_id,
        description: data.description,
        base_amount: data.base_amount,
        discount_type_id: data.discount_type_id || null,
        due_date: data.due_date,
      };
      await createFeeAssignment(payload);
      setOpenDialog(false);
      reset();
      loadFeeData();
    } catch (error) {
      console.error('Failed to assign fee', error);
      alert('Failed to assign fee');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this fee assignment?')) {
      try {
        await deleteFeeAssignment(id);
        loadFeeData();
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Failed to delete');
      }
    }
  };

  const handleEditClick = (fee: any) => {
    setEditingFee(fee);
    resetEdit({
      description: fee.description,
      base_amount: fee.base_amount,
      discount_type_id: fee.discount_type_id || '',
      due_date: fee.due_date,
    });
    setOpenEditDialog(true);
  };

  const handleEditSubmit = async (data: any) => {
    try {
      const payload = {
        description: data.description,
        base_amount: data.base_amount,
        discount_type_id: data.discount_type_id || null,
        due_date: data.due_date,
      };
      await updateFeeAssignment(editingFee.id, payload);
      setOpenEditDialog(false);
      loadFeeData();
    } catch (error) {
      console.error('Failed to update fee', error);
      alert('Failed to update fee');
    }
  };

  const individualColumns: GridColDef[] = [
    { field: 'description', headerName: 'Fee Description', width: 220 },
    { field: 'base_amount', headerName: 'Base Amount', width: 130, renderCell: (p) => `₹${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'discount_amount', headerName: 'Discount', width: 120, renderCell: (p) => `₹${Number(p.value || 0).toLocaleString('en-IN')}` },
    { field: 'net_amount', headerName: 'Net Amount', width: 130, renderCell: (p) => <strong style={{ color: '#4f46e5' }}>₹{Number(p.value).toLocaleString('en-IN')}</strong> },
    { field: 'paid_amount', headerName: 'Paid Amount', width: 130, renderCell: (p) => <span style={{ color: '#059669', fontWeight: 600 }}>₹{Number(p.value).toLocaleString('en-IN')}</span> },
    { field: 'due_date', headerName: 'Due Date', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const isPaid = params.value === 'Paid';
        const isPartial = params.value === 'Partial';
        return (
          <Chip
            label={params.value}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: isPaid ? 'rgba(16, 185, 129, 0.12)' : isPartial ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isPaid ? '#059669' : isPartial ? '#d97706' : '#dc2626',
            }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit" arrow>
            <IconButton size="small" color="primary" onClick={() => handleEditClick(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.paid_amount > 0 ? "Cannot delete settled fee" : "Delete"} arrow>
            <span>
              <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)} disabled={params.row.paid_amount > 0}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const currentCategoryName = categories.find(c => c.id === batchCategoryId)?.name || 'Fee';
  const currentGradeName = grades.find(g => g.id === batchGradeId)?.name || 'Grade';

  return (
    <Box sx={{ width: '100%', maxWidth: 1300, mx: 'auto', pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'text.primary' }}>
          Fee Structure & Assignments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Assign tuition, transportation, and special curriculum fees in bulk by grade or configure individual student balances.
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            bgcolor: 'background.paper',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              py: 2,
              minHeight: 56,
            }
          }}
        >
          <Tab
            icon={<GroupAddIcon />}
            iconPosition="start"
            label="Grade-Level Batch Assignment (Bulk)"
          />
          <Tab
            icon={<PersonIcon />}
            iconPosition="start"
            label="Individual Student Assignment"
          />
        </Tabs>
      </Paper>

      {/* ========================================================= */}
      {/* TAB 0: GRADE-LEVEL BATCH ASSIGNMENT                        */}
      {/* ========================================================= */}
      {activeTab === 0 && (
        <Box>
          {/* Top Configuration Card */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3.5, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1 }}>
              <SchoolIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Configure Batch Assignment Parameters
              </Typography>
            </Box>

            <Grid container spacing={2.5}>
              {/* Academic Year */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Academic Year</InputLabel>
                  <Select
                    label="Academic Year"
                    value={batchYearId}
                    onChange={(e) => setBatchYearId(Number(e.target.value))}
                  >
                    {academicYears.map((ay: any) => (
                      <MenuItem key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_active ? '(Active)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Grade */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Target Grade / Class</InputLabel>
                  <Select
                    label="Target Grade / Class"
                    value={batchGradeId}
                    onChange={(e) => setBatchGradeId(Number(e.target.value))}
                  >
                    {grades.map((g: any) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Fee Category */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Fee Category</InputLabel>
                  <Select
                    label="Fee Category"
                    value={batchCategoryId}
                    onChange={(e) => {
                      const cid = Number(e.target.value);
                      setBatchCategoryId(cid);
                      const cat = categories.find(c => c.id === cid);
                      if (cat?.name.toLowerCase().includes('bus')) {
                        setCommonAmount('15000');
                      } else if (cat?.name.toLowerCase().includes('tution') || cat?.name.toLowerCase().includes('tuition')) {
                        setCommonAmount('45000');
                      }
                    }}
                  >
                    {categories.map((c: any) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Common Base Amount */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Common Default Amount"
                  type="number"
                  value={commonAmount}
                  onChange={(e) => setCommonAmount(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  helperText="Default fee assigned to students in this grade"
                />
              </Grid>

              {/* Due Date */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Due Date"
                  type="date"
                  value={batchDueDate}
                  onChange={(e) => setBatchDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Fee Description / Remarks"
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                />
              </Grid>
            </Grid>

            {/* Quick Amount Presets & Apply Button */}
            <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Quick Amount Presets:
                </Typography>
                {[
                  { label: 'Tuition (₹45k)', amt: '45000' },
                  { label: 'Bus Fee (₹15k)', amt: '15000' },
                  { label: 'Term Installment (₹22.5k)', amt: '22500' },
                  { label: 'Abacus (₹3.5k)', amt: '3500' },
                ].map(p => (
                  <Chip
                    key={p.label}
                    label={p.label}
                    size="small"
                    clickable
                    onClick={() => setCommonAmount(p.amt)}
                    color={commonAmount === p.amt ? 'primary' : 'default'}
                    variant={commonAmount === p.amt ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>

              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<FlashOnIcon />}
                onClick={handleApplyCommonAmount}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Apply ₹{Number(commonAmount || 0).toLocaleString('en-IN')} to Selected Students
              </Button>
            </Box>
          </Paper>

          {/* Metric Cards Banner */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Total Grade Students
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                  {totalStudents}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Enrolled in {currentGradeName}
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main', textTransform: 'uppercase' }}>
                  Selected for Assignment
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'secondary.main' }}>
                  {selectedCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {totalStudents - selectedCount} excluded
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main', textTransform: 'uppercase' }}>
                  Already Assigned
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'warning.main' }}>
                  {alreadyAssignedCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Has {currentCategoryName}
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(79, 70, 229, 0.04)' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.dark', textTransform: 'uppercase' }}>
                  Total Batch Net Amount
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#4f46e5' }}>
                  ₹{totalBatchAmount.toLocaleString('en-IN')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  For {selectedCount} selected students
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Student Roster Table Card */}
          <Paper sx={{ borderRadius: 3.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 3 }}>
            {/* Table Action Toolbar */}
            <Box sx={{ p: 2.5, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Students in {currentGradeName} ({filteredRoster.length})
                </Typography>

                <Button size="small" variant="text" onClick={() => handleSelectAll(true)}>
                  Select All
                </Button>
                <Button size="small" variant="text" onClick={handleSelectOnlyUnassigned}>
                  Select Unassigned Only
                </Button>
                <Button size="small" variant="text" color="inherit" onClick={() => handleSelectAll(false)}>
                  Deselect All
                </Button>
              </Box>

              <TextField
                size="small"
                placeholder="Search by name, roll no, or admission..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: '100%', sm: 300 } }}
              />
            </Box>

            {loadingRoster ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Loading {currentGradeName} roster and fee status...
                </Typography>
              </Box>
            ) : filteredRoster.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No active students found in {currentGradeName}.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedCount > 0 && selectedCount < totalStudents}
                          checked={totalStudents > 0 && selectedCount === totalStudents}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </TableCell>
                      <TableCell width={60}>Roll #</TableCell>
                      <TableCell>Student Details</TableCell>
                      <TableCell width={160}>Current Status</TableCell>
                      <TableCell width={180}>Base Amount (₹)</TableCell>
                      <TableCell width={180}>Discount Concession</TableCell>
                      <TableCell width={140} align="right">Net Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRoster.map((s) => {
                      const isPaid = s.status === 'Paid';
                      const isPartial = s.status === 'Partial';
                      const isAssigned = s.is_assigned;

                      return (
                        <TableRow
                          key={s.student_id}
                          hover
                          selected={s.is_selected}
                          sx={{
                            opacity: isPaid ? 0.7 : 1,
                            bgcolor: s.is_selected ? 'rgba(79, 70, 229, 0.02)' : 'inherit'
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={s.is_selected}
                              onChange={() => handleToggleStudent(s.student_id)}
                              disabled={isPaid}
                            />
                          </TableCell>

                          <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            {s.roll_number || '-'}
                          </TableCell>

                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                src={s.photo_url}
                                sx={{ width: 34, height: 34, fontSize: '0.8rem', bgcolor: 'primary.main' }}
                              >
                                {s.first_name[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                  {s.first_name} {s.last_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Adm: {s.admission_number} {s.section_name ? `• Sec ${s.section_name}` : ''}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell>
                            {isPaid ? (
                              <Chip label={`Paid: ₹${s.paid_amount.toLocaleString('en-IN')}`} size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                            ) : isPartial ? (
                              <Chip label={`Partial (₹${s.paid_amount.toLocaleString('en-IN')})`} size="small" color="warning" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                            ) : isAssigned ? (
                              <Chip label={`Assigned: ₹${s.base_amount.toLocaleString('en-IN')}`} size="small" color="info" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                            ) : (
                              <Chip label="Not Assigned" size="small" variant="outlined" sx={{ color: 'text.secondary', fontSize: '0.7rem' }} />
                            )}
                          </TableCell>

                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={s.base_amount}
                              onChange={(e) => handleAmountChange(s.student_id, e.target.value)}
                              disabled={isPaid || !s.is_selected}
                              InputProps={{
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }}
                              sx={{ width: 140, '& input': { py: 0.75, fontWeight: 600 } }}
                            />
                          </TableCell>

                          <TableCell>
                            <FormControl size="small" fullWidth sx={{ minWidth: 150 }}>
                              <Select
                                value={s.discount_type_id}
                                onChange={(e) => handleDiscountChange(s.student_id, e.target.value as any)}
                                disabled={isPaid || !s.is_selected}
                                displayEmpty
                                sx={{ py: 0 }}
                              >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {discountTypes.map((d: any) => (
                                  <MenuItem key={d.id} value={d.id}>
                                    {d.name} ({d.percentage ? `${d.percentage}%` : `₹${d.flat_amount}`})
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>

                          <TableCell align="right" sx={{ fontWeight: 700, color: s.is_selected ? '#4f46e5' : 'text.disabled' }}>
                            ₹{s.net_amount.toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Sticky / Bottom Execution Action Bar */}
          <Paper
            elevation={3}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: '1px solid',
              borderColor: 'primary.light',
              bgcolor: 'background.paper',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Update amounts for already assigned students who have not paid yet
                  </Typography>
                }
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                  READY TO ASSIGN:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#4f46e5' }}>
                  {selectedCount} Students • ₹{totalBatchAmount.toLocaleString('en-IN')}
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="large"
                disabled={selectedCount === 0 || submittingBatch}
                onClick={() => setConfirmDialogOpen(true)}
                sx={{
                  borderRadius: 2.5,
                  px: 3.5,
                  py: 1.2,
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: '#b91c1c',
                  '&:hover': { bgcolor: '#991b1b' },
                }}
              >
                {submittingBatch ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  `Assign ${currentCategoryName} to ${selectedCount} Students`
                )}
              </Button>
            </Box>
          </Paper>

          {/* Confirmation Modal */}
          <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>
              Confirm Batch Fee Assignment
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body1" gutterBottom>
                You are about to assign <strong>{currentCategoryName}</strong> to students of <strong>{currentGradeName}</strong>.
              </Typography>

              <Box sx={{ my: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Academic Year:</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2" fontWeight={700}>{academicYears.find(y => y.id === batchYearId)?.name}</Typography></Grid>

                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Target Grade:</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2" fontWeight={700}>{currentGradeName}</Typography></Grid>

                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Fee Category:</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2" fontWeight={700}>{currentCategoryName}</Typography></Grid>

                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Selected Students:</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2" fontWeight={700}>{selectedCount} Students</Typography></Grid>

                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Total Batch Billing:</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2" fontWeight={800} color="primary.main">₹{totalBatchAmount.toLocaleString('en-IN')}</Typography></Grid>

                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Due Date:</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2" fontWeight={700}>{batchDueDate}</Typography></Grid>
                </Grid>
              </Box>

              {alreadyAssignedCount > 0 && !updateExisting && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Note: {alreadyAssignedCount} students who already have this fee assigned will be safely skipped to avoid duplicate billing.
                </Alert>
              )}

              {updateExisting && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Overwrite enabled: Students with existing unpaid assignments will have their base amounts updated to the entered values.
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setConfirmDialogOpen(false)} color="inherit">
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleExecuteBatchAssign}
                disabled={submittingBatch}
                sx={{ bgcolor: '#b91c1c', '&:hover': { bgcolor: '#991b1b' }, px: 3 }}
              >
                {submittingBatch ? <CircularProgress size={20} color="inherit" /> : 'Confirm & Execute'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Success Result Modal */}
          <Dialog open={Boolean(batchResult)} onClose={() => setBatchResult(null)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main', fontWeight: 800 }}>
              <CheckCircleIcon /> Batch Assignment Successful!
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" gutterBottom>
                {batchResult?.message}
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(16, 185, 129, 0.08)', borderRadius: 2 }}>
                <Typography variant="body2"><strong>New Assignments Created:</strong> {batchResult?.created_count}</Typography>
                <Typography variant="body2"><strong>Existing Assignments Updated:</strong> {batchResult?.updated_count}</Typography>
                <Typography variant="body2"><strong>Students Skipped:</strong> {batchResult?.skipped_count}</Typography>
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: 'success.dark' }}>
                  Total Fee Recorded: ₹{Number(batchResult?.total_assigned_amount || 0).toLocaleString('en-IN')}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button variant="contained" onClick={() => setBatchResult(null)}>
                Done
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* ========================================================= */}
      {/* TAB 1: INDIVIDUAL STUDENT ASSIGNMENT                       */}
      {/* ========================================================= */}
      {activeTab === 1 && (
        <Box>
          {/* Student Selector Card */}
          <Paper sx={{ p: 3, mb: 3.5, borderRadius: 3.5 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={selectedStudentId ? 9 : 12}>
                <StudentSelector
                  selectedStudentId={selectedStudentId}
                  onStudentSelect={(id) => setSelectedStudentId(id === '' ? '' : Number(id))}
                />
              </Grid>
              {selectedStudentId && (
                <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                    sx={{ borderRadius: 2, px: 2.5 }}
                  >
                    Assign Fee
                  </Button>
                </Grid>
              )}
            </Grid>
          </Paper>

          {feeData && (
            <Box>
              {/* Metric Cards */}
              <Grid container spacing={3} sx={{ mb: 3.5 }}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ p: 2.5, borderRadius: 3.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Assigned Fee
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                      ₹{Number(feeData.summary.total_assigned).toLocaleString('en-IN')}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ p: 2.5, borderRadius: 3.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Amount Paid
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                      ₹{Number(feeData.summary.total_paid).toLocaleString('en-IN')}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ p: 2.5, borderRadius: 3.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Net Outstanding
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main' }}>
                      ₹{Number(feeData.summary.total_outstanding).toLocaleString('en-IN')}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Assignments DataGrid */}
              <Paper sx={{ height: 500, width: '100%', borderRadius: 3.5, overflow: 'hidden' }}>
                <DataGrid
                  rows={feeData.assignments}
                  columns={individualColumns}
                  pageSizeOptions={[10, 20]}
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
            </Box>
          )}

          {/* Assign Fee Dialog */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Assign New Fee</DialogTitle>
            <DialogContent dividers>
              <form id="assign-fee-form" onSubmit={handleSubmit(handleAssignSubmit)}>
                <Grid container spacing={2} sx={{ pt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Academic Year</InputLabel>
                      <Select label="Academic Year" defaultValue="" {...register('academic_year_id', { required: true })}>
                        {academicYears.map((ay: any) => <MenuItem key={ay.id} value={ay.id}>{ay.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Fee Category</InputLabel>
                      <Select label="Fee Category" defaultValue="" {...register('fee_category_id', { required: true })}>
                        {categories.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Description (e.g. Term 1 Installment)" {...register('description', { required: true })} required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Base Amount" type="number" inputProps={{ step: "0.01" }} {...register('base_amount', { required: true })} required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Due Date" type="date" InputLabelProps={{ shrink: true }} {...register('due_date', { required: true })} required />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>Optional Discount</Typography>
                    <FormControl fullWidth>
                      <InputLabel>Discount Type</InputLabel>
                      <Select label="Discount Type" defaultValue="" {...register('discount_type_id')}>
                        <MenuItem value=""><em>None</em></MenuItem>
                        {discountTypes.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.name} ({d.percentage ? d.percentage + '%' : '₹' + d.flat_amount})</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </form>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button type="submit" form="assign-fee-form" variant="contained">Assign</Button>
            </DialogActions>
          </Dialog>

          {/* Edit Fee Dialog */}
          <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Fee Assignment</DialogTitle>
            <DialogContent dividers>
              {openEditDialog && (
              <form id="edit-fee-form" onSubmit={handleEditSubmitWrapper(handleEditSubmit)}>
                <Grid container spacing={2} sx={{ pt: 1 }}>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Description" InputLabelProps={{ shrink: true }} {...registerEdit('description', { required: true })} required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Base Amount" type="number" InputLabelProps={{ shrink: true }} inputProps={{ step: "0.01" }} {...registerEdit('base_amount', { required: true })} required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Due Date" type="date" InputLabelProps={{ shrink: true }} {...registerEdit('due_date', { required: true })} required />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>Optional Discount</Typography>
                    <FormControl fullWidth>
                      <InputLabel shrink>Discount Type</InputLabel>
                      <Select label="Discount Type" defaultValue={editingFee?.discount_type_id || ''} {...registerEdit('discount_type_id')}>
                        <MenuItem value=""><em>None</em></MenuItem>
                        {discountTypes.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.name} ({d.percentage ? d.percentage + '%' : '₹' + d.flat_amount})</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </form>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
              <Button type="submit" form="edit-fee-form" variant="contained" color="primary">Update</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
}
