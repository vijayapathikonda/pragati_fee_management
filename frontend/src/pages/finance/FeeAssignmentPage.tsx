import { useState, useEffect, useMemo, useRef } from 'react';
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
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
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
  custom_discount_amount: number;
  discount_amount: number;
  net_amount: number;
  paid_amount: number;
  status: string | null;
  due_date: string | null;
  is_selected: boolean;
}

const isSpecialDiscountType = (disc: any): boolean => {
  if (!disc) return false;
  const name = (disc.name || '').toLowerCase();
  return name.includes('special') || (!Number(disc.percentage) && !Number(disc.flat_amount));
};

const formatDiscountOptionLabel = (disc: any): string => {
  if (!disc) return '';
  if (isSpecialDiscountType(disc)) {
    return `${disc.name} (Custom ₹)`;
  }
  if (Number(disc.percentage) > 0) {
    return `${disc.name} (${disc.percentage}%)`;
  }
  if (Number(disc.flat_amount) > 0) {
    return `${disc.name} (-₹${Number(disc.flat_amount).toLocaleString('en-IN')})`;
  }
  return disc.name;
};

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
  const [batchGradeId, setBatchGradeId] = useState<number | ''>('');
  const [batchCategoryId, setBatchCategoryId] = useState<number | ''>('');
  const [commonAmount, setCommonAmount] = useState<string>('45000');
  const [batchDescription, setBatchDescription] = useState<string>('');
  const [batchDueDate, setBatchDueDate] = useState<string>('');
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
  const [submittingBatch, setSubmittingBatch] = useState<boolean>(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<any | null>(null);
  const rosterRequestSeqRef = useRef(0);

  // -------------------------------------------------------------
  // TAB 1: INDIVIDUAL STUDENT ASSIGNMENT STATE
  // -------------------------------------------------------------
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [feeData, setFeeData] = useState<{ summary: any, assignments: any[] } | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      academic_year_id: '' as number | '',
      fee_category_id: '' as number | '',
      description: '',
      base_amount: '45000',
      due_date: '',
      discount_type_id: '' as number | '',
      discount_amount: '',
    }
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmitWrapper,
    reset: resetEdit,
    watch: watchEdit,
    setValue: setValueEdit
  } = useForm({
    defaultValues: {
      description: '',
      base_amount: '',
      due_date: '',
      discount_type_id: '' as number | '',
      discount_amount: '',
    }
  });

  // Load Masters
  useEffect(() => {
    api.get('/masters/fee-categories?size=100')
      .then(res => {
        const cats = res.data.data || [];
        setCategories(cats);
        if (cats.length > 0) {
          const tuition = cats.find((c: any) => c.name.toLowerCase().includes('tution') || c.name.toLowerCase().includes('tuition'));
          setBatchCategoryId(tuition ? tuition.id : cats[0].id);
        }
      })
      .catch(err => console.error('Failed to load fee categories:', err));

    api.get('/masters/discount-types?size=100')
      .then(res => setDiscountTypes(res.data.data || []))
      .catch(err => console.error('Failed to load discount types:', err));

    api.get('/masters/academic-years?size=100&sort_by=id&sort_order=asc')
      .then(res => {
        const ays = res.data.data || [];
        setAcademicYears(ays);
        const active = ays.find((a: any) => a.is_active);
        if (active) setBatchYearId(active.id);
        else if (ays.length > 0) setBatchYearId(ays[ays.length - 1].id);
      })
      .catch(err => console.error('Failed to load academic years:', err));

    api.get('/masters/grades?size=100&sort_by=id&sort_order=asc')
      .then(res => {
        const gList = res.data.data || [];
        setGrades(gList);
        if (gList.length > 0) setBatchGradeId(gList[0].id);
      })
      .catch(err => console.error('Failed to load grades:', err));

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

  // Calculate discount & net helper
  const computeDiscount = (base: number, discId: number | '', customAmt: number = 0) => {
    const safeBase = Math.max(0, Number(base) || 0);
    if (!discId) {
      return { discountAmount: 0, netAmount: safeBase };
    }
    const disc = discountTypes.find(d => Number(d.id) === Number(discId));
    if (!disc) {
      return { discountAmount: 0, netAmount: safeBase };
    }
    let discAmt = 0;
    if (isSpecialDiscountType(disc)) {
      discAmt = Math.max(0, Number(customAmt) || 0);
    } else if (Number(disc.percentage) > 0) {
      discAmt = (safeBase * Number(disc.percentage)) / 100;
    } else if (Number(disc.flat_amount) > 0) {
      discAmt = Number(disc.flat_amount);
    }
    discAmt = Math.min(discAmt, safeBase);
    return {
      discountAmount: discAmt,
      netAmount: Math.max(0, safeBase - discAmt),
    };
  };

  // Load Roster for Batch Assignment (with request sequence guard against stale grade responses)
  const loadBatchRoster = async () => {
    if (!batchYearId || !batchGradeId || !batchCategoryId) return;
    const reqId = ++rosterRequestSeqRef.current;
    setLoadingRoster(true);
    try {
      const data = await getGradeFeeStatus(Number(batchYearId), Number(batchGradeId), Number(batchCategoryId));
      if (reqId !== rosterRequestSeqRef.current) return;

      const defaultAmtNum = parseFloat(commonAmount) || 0;
      const allAlreadyAssigned = data.length > 0 && data.every((item: any) => item.is_assigned);

      const mapped: StudentRosterItem[] = data.map((item: any) => {
        const baseAmt = item.is_assigned && item.base_amount != null ? Number(item.base_amount) : defaultAmtNum;
        const discTypeId: number | '' = item.is_assigned && item.discount_type_id ? Number(item.discount_type_id) : '';
        const existingDiscAmt = item.is_assigned && item.discount_amount != null ? Number(item.discount_amount) : 0;
        const existingNetAmt = item.is_assigned && item.net_amount != null
          ? Number(item.net_amount)
          : Math.max(0, baseAmt - existingDiscAmt);

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
          discount_type_id: discTypeId,
          custom_discount_amount: existingDiscAmt,
          discount_amount: existingDiscAmt,
          net_amount: existingNetAmt,
          paid_amount: item.paid_amount ? Number(item.paid_amount) : 0,
          status: item.status,
          due_date: item.due_date,
          is_selected: allAlreadyAssigned ? item.status !== 'Paid' : !item.is_assigned,
        };
      });
      setRoster(mapped);
    } catch (err) {
      console.error('Failed to load grade fee status:', err);
    } finally {
      if (reqId === rosterRequestSeqRef.current) {
        setLoadingRoster(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 0 && batchYearId && batchGradeId && batchCategoryId) {
      setSearchFilter('');
      loadBatchRoster();
    }
  }, [activeTab, batchYearId, batchGradeId, batchCategoryId]);

  // Student Base Amount Change Handler
  const handleAmountChange = (studentId: number, val: string) => {
    const num = parseFloat(val) || 0;
    setRoster(prev => prev.map(s => {
      if (s.student_id === studentId) {
        const { discountAmount, netAmount } = computeDiscount(num, s.discount_type_id, s.custom_discount_amount);
        return {
          ...s,
          is_selected: true,
          base_amount: num,
          discount_amount: discountAmount,
          net_amount: netAmount
        };
      }
      return s;
    }));
  };

  // Student Discount Type Change Handler
  const handleDiscountChange = (studentId: number, discId: number | '') => {
    const normalizedId: number | '' = discId === '' || discId === null || discId === undefined ? '' : Number(discId);
    setRoster(prev => prev.map(s => {
      if (s.student_id === studentId) {
        const disc = discountTypes.find(d => Number(d.id) === normalizedId);
        const isSpec = isSpecialDiscountType(disc);
        // Default Special Discount to 3000 if not yet entered, otherwise 0
        const nextCustomAmt = isSpec ? (s.custom_discount_amount > 0 ? s.custom_discount_amount : 3000) : 0;
        const { discountAmount, netAmount } = computeDiscount(s.base_amount, normalizedId, nextCustomAmt);
        return {
          ...s,
          is_selected: true,
          discount_type_id: normalizedId,
          custom_discount_amount: nextCustomAmt,
          discount_amount: discountAmount,
          net_amount: netAmount
        };
      }
      return s;
    }));
  };

  // Student Custom Special Discount Amount Change Handler
  const handleCustomDiscountAmountChange = (studentId: number, val: string) => {
    const customNum = Math.max(0, parseFloat(val) || 0);
    setRoster(prev => prev.map(s => {
      if (s.student_id === studentId) {
        const { discountAmount, netAmount } = computeDiscount(s.base_amount, s.discount_type_id, customNum);
        return {
          ...s,
          is_selected: true,
          custom_discount_amount: customNum,
          discount_amount: discountAmount,
          net_amount: netAmount
        };
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
        const { discountAmount, netAmount } = computeDiscount(num, s.discount_type_id, s.custom_discount_amount);
        return { ...s, base_amount: num, discount_amount: discountAmount, net_amount: netAmount };
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
          discount_amount: s.discount_amount || 0,
          is_selected: s.is_selected,
        })),
      };

      const res = await batchAssignFees(payload);
      setBatchResult(res);
      setConfirmDialogOpen(false);
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

  // Watched fields for Individual Assign Modal
  const watchedBase = watch('base_amount');
  const watchedDiscId = watch('discount_type_id');
  const watchedCustomDisc = watch('discount_amount');
  const selectedAssignDiscountObj = discountTypes.find(d => d.id === Number(watchedDiscId));
  const isAssignSpecial = isSpecialDiscountType(selectedAssignDiscountObj);
  const assignCalc = computeDiscount(
    parseFloat(String(watchedBase)) || 0,
    watchedDiscId ? Number(watchedDiscId) : '',
    parseFloat(String(watchedCustomDisc)) || 0
  );

  // Watched fields for Individual Edit Modal
  const watchedEditBase = watchEdit('base_amount');
  const watchedEditDiscId = watchEdit('discount_type_id');
  const watchedEditCustomDisc = watchEdit('discount_amount');
  const selectedEditDiscountObj = discountTypes.find(d => d.id === Number(watchedEditDiscId));
  const isEditSpecial = isSpecialDiscountType(selectedEditDiscountObj);
  const editCalc = computeDiscount(
    parseFloat(String(watchedEditBase)) || 0,
    watchedEditDiscId ? Number(watchedEditDiscId) : '',
    parseFloat(String(watchedEditCustomDisc)) || 0
  );

  const handleOpenCreateDialog = () => {
    const activeAy = academicYears.find((a: any) => a.is_active) || academicYears[academicYears.length - 1];
    const defaultCat = categories.find((c: any) => c.name.toLowerCase().includes('tution') || c.name.toLowerCase().includes('tuition')) || categories[0];
    reset({
      academic_year_id: activeAy ? activeAy.id : '',
      fee_category_id: defaultCat ? defaultCat.id : '',
      description: defaultCat ? `${defaultCat.name} (${activeAy?.name || ''})`.trim() : 'Annual Tuition Fee',
      base_amount: '45000',
      due_date: batchDueDate,
      discount_type_id: '',
      discount_amount: '',
    });
    setOpenDialog(true);
  };

  const handleAssignSubmit = async (data: any) => {
    try {
      const discObj = discountTypes.find(d => d.id === Number(data.discount_type_id));
      const isSpec = isSpecialDiscountType(discObj);
      const calc = computeDiscount(
        parseFloat(data.base_amount) || 0,
        data.discount_type_id ? Number(data.discount_type_id) : '',
        parseFloat(data.discount_amount) || 0
      );
      const payload = {
        student_id: selectedStudentId,
        academic_year_id: Number(data.academic_year_id),
        fee_category_id: Number(data.fee_category_id),
        description: data.description,
        base_amount: parseFloat(data.base_amount) || 0,
        discount_type_id: data.discount_type_id ? Number(data.discount_type_id) : null,
        discount_amount: isSpec ? (parseFloat(data.discount_amount) || 0) : calc.discountAmount,
        due_date: data.due_date,
      };
      await createFeeAssignment(payload);
      setOpenDialog(false);
      reset();
      loadFeeData();
    } catch (error: any) {
      console.error('Failed to assign fee', error);
      alert(error.response?.data?.detail || 'Failed to assign fee');
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
      discount_amount: fee.discount_amount || '',
      due_date: fee.due_date,
    });
    setOpenEditDialog(true);
  };

  const handleEditSubmit = async (data: any) => {
    try {
      const discObj = discountTypes.find(d => d.id === Number(data.discount_type_id));
      const isSpec = isSpecialDiscountType(discObj);
      const calc = computeDiscount(
        parseFloat(data.base_amount) || 0,
        data.discount_type_id ? Number(data.discount_type_id) : '',
        parseFloat(data.discount_amount) || 0
      );
      const payload = {
        description: data.description,
        base_amount: parseFloat(data.base_amount) || 0,
        discount_type_id: data.discount_type_id ? Number(data.discount_type_id) : null,
        discount_amount: isSpec ? (parseFloat(data.discount_amount) || 0) : calc.discountAmount,
        due_date: data.due_date,
      };
      await updateFeeAssignment(editingFee.id, payload);
      setOpenEditDialog(false);
      loadFeeData();
    } catch (error: any) {
      console.error('Failed to update fee', error);
      alert(error.response?.data?.detail || 'Failed to update fee');
    }
  };

  const individualColumns: GridColDef[] = [
    { field: 'description', headerName: 'Fee Description', flex: 1, minWidth: 190 },
    {
      field: 'base_amount',
      headerName: 'Base Amount',
      width: 125,
      renderCell: (p) => <span style={{ fontWeight: 600 }}>₹{Number(p.value).toLocaleString('en-IN')}</span>
    },
    {
      field: 'discount_type',
      headerName: 'Discount Type',
      width: 190,
      renderCell: (p) => {
        const dt = p.row.discount_type;
        if (!dt) return <span style={{ color: '#94a3b8' }}>None</span>;
        return (
          <Chip
            icon={<LocalOfferIcon style={{ fontSize: '0.85rem' }} />}
            label={dt.name}
            size="small"
            color="secondary"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.73rem' }}
          />
        );
      }
    },
    {
      field: 'discount_amount',
      headerName: 'Percentage / Discount',
      width: 165,
      renderCell: (p) => {
        const dt = p.row.discount_type;
        const amt = Number(p.value || 0);
        if (amt <= 0) return <span style={{ color: '#94a3b8' }}>₹0</span>;
        if (dt && Number(dt.percentage) > 0) {
          return (
            <span style={{ color: '#d97706', fontWeight: 700 }}>
              {dt.percentage}% (-₹{amt.toLocaleString('en-IN')})
            </span>
          );
        }
        return (
          <span style={{ color: '#d97706', fontWeight: 700 }}>
            -₹{amt.toLocaleString('en-IN')}
          </span>
        );
      }
    },
    {
      field: 'net_amount',
      headerName: 'Net Amount',
      width: 130,
      renderCell: (p) => <strong style={{ color: '#4f46e5', fontSize: '0.92rem' }}>₹{Number(p.value).toLocaleString('en-IN')}</strong>
    },
    {
      field: 'paid_amount',
      headerName: 'Paid Amount',
      width: 125,
      renderCell: (p) => <span style={{ color: '#059669', fontWeight: 600 }}>₹{Number(p.value).toLocaleString('en-IN')}</span>
    },
    { field: 'due_date', headerName: 'Due Date', width: 115 },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
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
      width: 105,
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
    <Box sx={{ width: '100%', maxWidth: 1350, mx: 'auto', pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'text.primary' }}>
          Fee Structure & Assignments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Assign tuition, transportation, and special curriculum fees with automatic discount calculation.
        </Typography>
      </Box>

      {/* Official School Discount Plans Reference Strip */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(79, 70, 229, 0.03)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: 1 }}>
          <LocalOfferIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Discount Plans:
          </Typography>
        </Box>
        <Chip label="Teacher Parent: 50% OFF" size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
        <Chip label="One Shot Payment: -₹2,000" size="small" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
        <Chip label="Sibling + One Shot: -₹3,000" size="small" color="secondary" variant="outlined" sx={{ fontWeight: 700 }} />
        <Chip label="Siblings Discount: -₹1,000" size="small" color="info" variant="outlined" sx={{ fontWeight: 700 }} />
        <Chip label="Special Discount: Custom ₹ (e.g. ₹3,000 / ₹4,000 / ₹5,000)" size="small" color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
      </Paper>

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
                  label="Common Default Base Amount"
                  type="number"
                  value={commonAmount}
                  onChange={(e) => setCommonAmount(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  helperText="Default base fee before discount"
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
                  Quick Base Amount Presets:
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
              <TableContainer sx={{ maxHeight: 620 }}>
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
                      <TableCell width={55}>Roll #</TableCell>
                      <TableCell>Student Details</TableCell>
                      <TableCell width={145}>Current Status</TableCell>
                      <TableCell width={150}>Base Amount (₹)</TableCell>
                      <TableCell width={220}>Discount Type</TableCell>
                      <TableCell width={190}>Percentage / Special (₹)</TableCell>
                      <TableCell width={140} align="right">Net Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRoster.map((s) => {
                      const isPaid = s.status === 'Paid';
                      const isPartial = s.status === 'Partial';
                      const isAssigned = s.is_assigned;
                      const selectedDisc = discountTypes.find(d => d.id === Number(s.discount_type_id));
                      const isSpecial = isSpecialDiscountType(selectedDisc);

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
                              <Box>
                                <Chip label={`Net: ₹${s.net_amount.toLocaleString('en-IN')}`} size="small" color="info" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                {s.discount_amount > 0 && (
                                  <Typography variant="caption" sx={{ display: 'block', color: 'success.main', fontWeight: 700, mt: 0.25 }}>
                                    Disc: -₹{s.discount_amount.toLocaleString('en-IN')}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Chip label="Not Assigned" size="small" variant="outlined" sx={{ color: 'text.secondary', fontSize: '0.7rem' }} />
                            )}
                          </TableCell>

                          {/* Base Amount Column */}
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={s.base_amount}
                              onChange={(e) => handleAmountChange(s.student_id, e.target.value)}
                              disabled={isPaid}
                              InputProps={{
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }}
                              sx={{ width: 135, '& input': { py: 0.75, fontWeight: 600 } }}
                            />
                          </TableCell>

                          {/* Discount Type Dropdown */}
                          <TableCell>
                            <FormControl size="small" fullWidth sx={{ minWidth: 195 }}>
                              <Select
                                value={s.discount_type_id}
                                onChange={(e) => handleDiscountChange(s.student_id, e.target.value as any)}
                                disabled={isPaid}
                                displayEmpty
                                sx={{ py: 0, fontSize: '0.84rem' }}
                              >
                                <MenuItem value=""><em>No Discount</em></MenuItem>
                                {discountTypes.map((d: any) => (
                                  <MenuItem key={d.id} value={d.id}>
                                    {formatDiscountOptionLabel(d)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>

                          {/* Percentage / Special Discount Amount Column */}
                          <TableCell>
                            {!selectedDisc ? (
                              <Typography variant="body2" color="text.disabled">
                                —
                              </Typography>
                            ) : isSpecial ? (
                              <Box>
                                <TextField
                                  size="small"
                                  type="number"
                                  placeholder="e.g. 3000"
                                  value={s.custom_discount_amount || ''}
                                  onChange={(e) => handleCustomDiscountAmountChange(s.student_id, e.target.value)}
                                  disabled={isPaid}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                  }}
                                  sx={{ width: 135, '& input': { py: 0.6, fontWeight: 700, color: '#d97706' } }}
                                />
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                  {[3000, 4000, 5000].map(amt => (
                                    <Chip
                                      key={amt}
                                      label={`₹${amt / 1000}k`}
                                      size="small"
                                      clickable
                                      disabled={isPaid}
                                      onClick={() => handleCustomDiscountAmountChange(s.student_id, String(amt))}
                                      color={s.custom_discount_amount === amt ? 'warning' : 'default'}
                                      variant={s.custom_discount_amount === amt ? 'filled' : 'outlined'}
                                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            ) : Number(selectedDisc.percentage) > 0 ? (
                              <Box>
                                <Chip
                                  label={`${selectedDisc.percentage}% OFF`}
                                  size="small"
                                  color="primary"
                                  sx={{ height: 22, fontWeight: 700, fontSize: '0.72rem' }}
                                />
                                <Typography variant="caption" sx={{ display: 'block', color: 'success.main', fontWeight: 700, mt: 0.25 }}>
                                  -₹{s.discount_amount.toLocaleString('en-IN')}
                                </Typography>
                              </Box>
                            ) : (
                              <Chip
                                label={`-₹${s.discount_amount.toLocaleString('en-IN')}`}
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                              />
                            )}
                          </TableCell>

                          {/* Net Amount Column */}
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                color: '#4f46e5'
                              }}
                            >
                              ₹{s.net_amount.toLocaleString('en-IN')}
                            </Typography>
                            {s.discount_amount > 0 && (
                              <Typography variant="caption" sx={{ display: 'block', color: 'success.main', fontWeight: 600 }}>
                                Saved ₹{s.discount_amount.toLocaleString('en-IN')}
                              </Typography>
                            )}
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
                    Update amounts & discounts for already assigned students who have not paid yet
                  </Typography>
                }
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                  READY TO ASSIGN (NET TOTAL):
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

                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Total Net Billing:</Typography></Grid>
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
                  Overwrite enabled: Students with existing unpaid assignments will have their base amounts, discounts, and net amounts updated.
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
                  Total Net Fee Recorded: ₹{Number(batchResult?.total_assigned_amount || 0).toLocaleString('en-IN')}
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
                    onClick={handleOpenCreateDialog}
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
                      Total Net Assigned Fee
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

          {/* Assign New Fee Dialog */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>Assign New Fee</DialogTitle>
            <DialogContent dividers>
              <form id="assign-fee-form" onSubmit={handleSubmit(handleAssignSubmit)}>
                <Grid container spacing={2} sx={{ pt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel shrink>Academic Year</InputLabel>
                      <Select
                        label="Academic Year"
                        value={watch('academic_year_id')}
                        onChange={(e) => setValue('academic_year_id', e.target.value as any)}
                      >
                        {academicYears.map((ay: any) => <MenuItem key={ay.id} value={ay.id}>{ay.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel shrink>Fee Category</InputLabel>
                      <Select
                        label="Fee Category"
                        value={watch('fee_category_id')}
                        onChange={(e) => setValue('fee_category_id', e.target.value as any)}
                      >
                        {categories.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description (e.g. Annual Tuition Fee)"
                      InputLabelProps={{ shrink: true }}
                      {...register('description', { required: true })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Base Amount (₹)"
                      type="number"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: "0.01", min: "0" }}
                      {...register('base_amount', { required: true })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Due Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      {...register('due_date', { required: true })}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 0.5 }} />
                    <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1, mt: 1 }}>
                      Discount Plan & Concession
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={isAssignSpecial ? 6 : 12}>
                    <FormControl fullWidth>
                      <InputLabel shrink>Discount Type</InputLabel>
                      <Select
                        label="Discount Type"
                        displayEmpty
                        value={watchedDiscId}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setValue('discount_type_id', val);
                          const d = discountTypes.find(x => x.id === Number(val));
                          if (isSpecialDiscountType(d) && !watchedCustomDisc) {
                            setValue('discount_amount', '3000');
                          }
                        }}
                      >
                        <MenuItem value=""><em>No Discount</em></MenuItem>
                        {discountTypes.map((d: any) => (
                          <MenuItem key={d.id} value={d.id}>
                            {formatDiscountOptionLabel(d)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {isAssignSpecial && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Special Discount Amount (₹)"
                        type="number"
                        placeholder="e.g. 3000, 4000, 5000"
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: "1", min: "0" }}
                        {...register('discount_amount')}
                      />
                      <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
                        {[3000, 4000, 5000].map(amt => (
                          <Chip
                            key={amt}
                            label={`₹${amt.toLocaleString('en-IN')}`}
                            size="small"
                            clickable
                            onClick={() => setValue('discount_amount', String(amt))}
                            color={Number(watchedCustomDisc) === amt ? 'warning' : 'default'}
                            variant={Number(watchedCustomDisc) === amt ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}

                  {/* Live Calculation Preview Card */}
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        mt: 1,
                        p: 2,
                        borderRadius: 2.5,
                        bgcolor: 'rgba(79, 70, 229, 0.05)',
                        border: '1px solid rgba(79, 70, 229, 0.2)',
                      }}
                    >
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            BASE AMOUNT
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            ₹{(parseFloat(String(watchedBase)) || 0).toLocaleString('en-IN')}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            DISCOUNT DEDUCTED
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.main' }}>
                            - ₹{assignCalc.discountAmount.toLocaleString('en-IN')}
                            {selectedAssignDiscountObj && Number(selectedAssignDiscountObj.percentage) > 0
                              ? ` (${selectedAssignDiscountObj.percentage}%)`
                              : ''}
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                            NET AMOUNT PAYABLE
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#4f46e5' }}>
                            ₹{assignCalc.netAmount.toLocaleString('en-IN')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button type="submit" form="assign-fee-form" variant="contained">
                Assign Fee (₹{assignCalc.netAmount.toLocaleString('en-IN')})
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Fee Dialog */}
          <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>Edit Fee Assignment</DialogTitle>
            <DialogContent dividers>
              {openEditDialog && (
              <form id="edit-fee-form" onSubmit={handleEditSubmitWrapper(handleEditSubmit)}>
                <Grid container spacing={2} sx={{ pt: 1 }}>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Description" InputLabelProps={{ shrink: true }} {...registerEdit('description', { required: true })} required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Base Amount (₹)" type="number" InputLabelProps={{ shrink: true }} inputProps={{ step: "0.01" }} {...registerEdit('base_amount', { required: true })} required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Due Date" type="date" InputLabelProps={{ shrink: true }} {...registerEdit('due_date', { required: true })} required />
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 0.5 }} />
                    <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1, mt: 1 }}>
                      Discount Plan & Concession
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={isEditSpecial ? 6 : 12}>
                    <FormControl fullWidth>
                      <InputLabel shrink>Discount Type</InputLabel>
                      <Select
                        label="Discount Type"
                        displayEmpty
                        value={watchedEditDiscId}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setValueEdit('discount_type_id', val);
                          const d = discountTypes.find(x => x.id === Number(val));
                          if (isSpecialDiscountType(d) && !watchedEditCustomDisc) {
                            setValueEdit('discount_amount', '3000');
                          }
                        }}
                      >
                        <MenuItem value=""><em>No Discount</em></MenuItem>
                        {discountTypes.map((d: any) => (
                          <MenuItem key={d.id} value={d.id}>
                            {formatDiscountOptionLabel(d)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {isEditSpecial && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Special Discount Amount (₹)"
                        type="number"
                        placeholder="e.g. 3000, 4000, 5000"
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: "1", min: "0" }}
                        {...registerEdit('discount_amount')}
                      />
                      <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
                        {[3000, 4000, 5000].map(amt => (
                          <Chip
                            key={amt}
                            label={`₹${amt.toLocaleString('en-IN')}`}
                            size="small"
                            clickable
                            onClick={() => setValueEdit('discount_amount', String(amt))}
                            color={Number(watchedEditCustomDisc) === amt ? 'warning' : 'default'}
                            variant={Number(watchedEditCustomDisc) === amt ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}

                  {/* Live Calculation Preview Card */}
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        mt: 1,
                        p: 2,
                        borderRadius: 2.5,
                        bgcolor: 'rgba(79, 70, 229, 0.05)',
                        border: '1px solid rgba(79, 70, 229, 0.2)',
                      }}
                    >
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            BASE AMOUNT
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            ₹{(parseFloat(String(watchedEditBase)) || 0).toLocaleString('en-IN')}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            DISCOUNT DEDUCTED
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.main' }}>
                            - ₹{editCalc.discountAmount.toLocaleString('en-IN')}
                            {selectedEditDiscountObj && Number(selectedEditDiscountObj.percentage) > 0
                              ? ` (${selectedEditDiscountObj.percentage}%)`
                              : ''}
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                            NET AMOUNT PAYABLE
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#4f46e5' }}>
                            ₹{editCalc.netAmount.toLocaleString('en-IN')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                </Grid>
              </form>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
              <Button type="submit" form="edit-fee-form" variant="contained" color="primary">
                Update Fee (₹{editCalc.netAmount.toLocaleString('en-IN')})
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
}
