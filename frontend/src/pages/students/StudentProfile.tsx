import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box, Paper, Typography, Grid, Button, Avatar, Chip, CircularProgress, Divider, Card,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Badge, Alert, FormHelperText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { getStudentById, updateStudent, uploadStudentPhoto } from '../../services/student';
import { getStudentFees } from '../../services/fee';
import api, { getFileUrl } from '../../services/api';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [feeSummary, setFeeSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openEdit, setOpenEdit] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');
  
  const [academicYears, setAcademicYears] = useState([]);
  const [grades, setGrades] = useState([]);
  
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm({
    mode: 'onTouched'
  });

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey) return;
    if (['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const phoneValidationRule = {
    validate: (val: string | undefined) => {
      if (!val || val.trim() === '') return true;
      const trimmed = val.trim();
      if (!/^[0-9]+$/.test(trimmed)) return 'Phone number must contain only numbers';
      if (trimmed.length !== 10) return 'Phone number must be exactly 10 digits';
      return true;
    }
  };

  const serialNumberValidationRule = {
    validate: (val: any) => {
      if (val === undefined || val === null || val === '') return true;
      const str = String(val).trim();
      if (str === '') return true;
      if (!/^[0-9]+$/.test(str)) return 'Serial number must contain only numbers';
      if (Number(str) <= 0) return 'Serial number must be greater than 0';
      return true;
    }
  };

  const emailValidationRule = {
    validate: (val: string | undefined) => {
      if (!val || val.trim() === '') return true;
      return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(val.trim()) || 'Invalid email address format';
    }
  };

  useEffect(() => {
    loadStudentData();
    loadMasters();
  }, [id]);

  const loadMasters = () => {
    Promise.all([
      api.get('/masters/academic-years?size=100&sort_by=id&sort_order=asc'),
      api.get('/masters/grades?size=100&sort_by=id&sort_order=asc')
    ])
      .then(([ayRes, gRes]) => {
        setAcademicYears(ayRes.data.data);
        setGrades(gRes.data.data);
      })
      .catch(console.error);
  };

  const loadStudentData = () => {
    setLoading(true);
    Promise.all([
      getStudentById(Number(id)),
      getStudentFees(Number(id))
    ])
      .then(([studentData, feeData]) => {
        setStudent(studentData);
        setFeeSummary(feeData.summary);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleEditClick = () => {
    setEditErrorMsg('');
    clearErrors();
    reset({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      serial_number: student.serial_number !== null && student.serial_number !== undefined ? student.serial_number : '',
      academic_year_id: student.academic_year_id || '',
      grade_id: student.grade_id || '',
      date_of_birth: student.date_of_birth || '',
      gender: student.gender || '',
      father_name: student.father_name || '',
      father_contact_number: student.father_contact_number || '',
      mother_name: student.mother_name || '',
      mother_contact_number: student.mother_contact_number || '',
      contact_number: student.contact_number || '',
      email: student.email || '',
      address: student.address || '',
    });
    setOpenEdit(true);
  };

  const handleEditSubmit = async (formData: any) => {
    setEditErrorMsg('');
    clearErrors();
    try {
      const payload: any = { ...formData };

      if (payload.academic_year_id) {
        payload.academic_year_id = Number(payload.academic_year_id);
      }
      if (payload.grade_id) {
        payload.grade_id = Number(payload.grade_id);
      }

      if (payload.serial_number === undefined || payload.serial_number === null || payload.serial_number === '') {
        payload.serial_number = null;
      } else {
        payload.serial_number = Number(payload.serial_number);
      }

      if (!payload.email || payload.email.trim() === '') {
        payload.email = null;
      } else {
        payload.email = payload.email.trim();
      }

      const stringFields = [
        'first_name', 'last_name', 'contact_number',
        'father_name', 'father_contact_number', 'mother_name', 'mother_contact_number',
        'address', 'gender'
      ];

      for (const field of stringFields) {
        if (payload[field] !== undefined) {
          const val = typeof payload[field] === 'string' ? payload[field].trim() : payload[field];
          payload[field] = val || null;
        }
      }

      await updateStudent(Number(id), payload);
      setOpenEdit(false);
      loadStudentData();
    } catch (error: any) {
      console.error('Update student failed', error);
      const responseData = error?.response?.data;

      if (responseData) {
        if (responseData.errors && typeof responseData.errors === 'object' && !Array.isArray(responseData.errors)) {
          Object.entries(responseData.errors).forEach(([field, message]) => {
            setError(field as any, { type: 'server', message: message as string });
          });
          setEditErrorMsg(responseData.detail || 'Please correct the highlighted fields.');
        } else if (Array.isArray(responseData.detail)) {
          const msgs: string[] = [];
          responseData.detail.forEach((item: any) => {
            const loc = item.loc || [];
            const field = loc[loc.length - 1];
            const cleanMsg = item.msg ? item.msg.replace(/^Value error,\s*/, '') : 'Invalid field value';
            if (field) {
              setError(field as any, { type: 'server', message: cleanMsg });
              msgs.push(`${String(field).replace(/_/g, ' ')}: ${cleanMsg}`);
            } else {
              msgs.push(cleanMsg);
            }
          });
          setEditErrorMsg(msgs.join('; ') || 'Validation failed. Please correct highlighted fields.');
        } else if (typeof responseData.detail === 'string') {
          setEditErrorMsg(responseData.detail);
        } else {
          setEditErrorMsg('Failed to update student profile. Please check the fields.');
        }
      } else {
        setEditErrorMsg(error?.message || 'Failed to update student profile. Please try again.');
      }
    }
  };

  const onEditInvalid = (fieldErrors: any) => {
    const firstKey = Object.keys(fieldErrors)[0];
    if (firstKey && fieldErrors[firstKey]?.message) {
      setEditErrorMsg(`Please check field: ${fieldErrors[firstKey].message}`);
    } else {
      setEditErrorMsg('Please fill in all required fields and correct any highlighted errors.');
    }
  };

  const handlePhotoUpload = async (event: any) => {
    const file = event.target.files[0];
    if (file) {
      try {
        await uploadStudentPhoto(Number(id), file);
        loadStudentData();
      } catch (error) {
        alert('Failed to upload photo');
      }
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (!student) return <Typography>Student not found</Typography>;
  
  return (
    <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/students')} sx={{ mb: 2 }}>
        Back to List
      </Button>
      
      <Paper sx={{ p: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <IconButton color="primary" aria-label="upload picture" component="label" sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                  <input hidden accept="image/jpeg,image/png" type="file" onChange={handlePhotoUpload} />
                  <PhotoCamera />
                </IconButton>
              }
            >
              <Avatar
                src={student.photo_path ? getFileUrl(student.photo_path) : undefined}
                sx={{ width: 150, height: 150, mb: 2, fontSize: '3rem', bgcolor: 'primary.main' }}
              >
                {student.first_name?.[0]?.toUpperCase()}
              </Avatar>
            </Badge>
            <Typography variant="h6" align="center">{student.first_name} {student.last_name}</Typography>
            <Typography variant="body2" color="textSecondary" align="center" gutterBottom>
              {student.admission_number}
            </Typography>
            <Chip 
              label={student.status} 
              color={student.status === 'Active' ? 'success' : 'default'} 
              size="small" 
            />
          </Grid>
          
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" color="primary">Academic Details</Typography>
              <Button startIcon={<EditIcon />} variant="outlined" size="small" onClick={handleEditClick}>
                Edit Profile
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Academic Year</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{student.academic_year?.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Grade / Standard</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{student.grade?.name}</Typography>
              </Grid>
            </Grid>

            <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
              Personal & Guardian Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Serial Number (SN)</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{student.serial_number ?? '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Admission Number</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main', fontFamily: 'monospace' }}>{student.admission_number}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Date of Birth</Typography>
                <Typography variant="body1">{student.date_of_birth}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Father Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{student.father_name || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Father Contact Number</Typography>
                <Typography variant="body1">{student.father_contact_number || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Mother Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{student.mother_name || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Mother Contact Number</Typography>
                <Typography variant="body1">{student.mother_contact_number || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Gender</Typography>
                <Typography variant="body1">{student.gender || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Other Contact</Typography>
                <Typography variant="body1">{student.contact_number || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">Email</Typography>
                <Typography variant="body1">{student.email || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Residential Address</Typography>
                <Typography variant="body1">{student.address || '-'}</Typography>
              </Grid>
            </Grid>

            {feeSummary && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
                  Financial Status Summary
                </Typography>
                <Divider sx={{ mb: 2.5 }} />
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={4}>
                    <Card
                      sx={{
                        p: 2.25,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(79, 70, 229, 0.08)' : 'rgba(79, 70, 229, 0.04)',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Total Assigned Fees
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'text.primary' }}>
                        ₹{feeSummary.total_assigned}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card
                      sx={{
                        p: 2.25,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Total Paid Amount
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                        ₹{feeSummary.total_paid}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card
                      sx={{
                        p: 2.25,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Total Outstanding Dues
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main' }}>
                        ₹{feeSummary.total_outstanding}
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2.5, textAlign: 'right' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate('/finance/fee-assignments')}
                    sx={{ borderRadius: 2 }}
                  >
                    Manage Fee Heads
                  </Button>
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
      {/* Edit Profile Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Student Profile</DialogTitle>
        <DialogContent dividers>
          {editErrorMsg && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setEditErrorMsg('')}>
              {editErrorMsg}
            </Alert>
          )}
          {openEdit && (
          <form id="edit-student-form" onSubmit={handleSubmit(handleEditSubmit, onEditInvalid)} noValidate>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Serial Number (SN)"
                  type="text"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  onKeyDown={handleNumericKeyDown}
                  error={!!errors.serial_number}
                  helperText={errors.serial_number?.message as string || 'Optional positive number'}
                  {...register('serial_number', serialNumberValidationRule)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="First Name"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.first_name}
                  helperText={errors.first_name?.message as string}
                  {...register('first_name', {
                    required: 'Student First Name is required',
                    validate: (val) => (val && val.trim() !== '') || 'First Name cannot be blank'
                  })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Last Name"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.last_name}
                  helperText={errors.last_name?.message as string}
                  {...register('last_name')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!errors.academic_year_id}>
                  <InputLabel shrink id="edit-ay-label">Academic Year</InputLabel>
                  <Select
                    labelId="edit-ay-label"
                    label="Academic Year"
                    defaultValue={student?.academic_year_id || ''}
                    {...register('academic_year_id', { required: 'Academic Year is required' })}
                  >
                    {academicYears.map((ay: any) => <MenuItem key={ay.id} value={ay.id}>{ay.name}</MenuItem>)}
                  </Select>
                  {errors.academic_year_id && (
                    <FormHelperText>{errors.academic_year_id.message as string}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!errors.grade_id}>
                  <InputLabel shrink id="edit-grade-label">Grade</InputLabel>
                  <Select
                    labelId="edit-grade-label"
                    label="Grade"
                    defaultValue={student?.grade_id || ''}
                    {...register('grade_id', { required: 'Grade is required' })}
                  >
                    {grades.map((g: any) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                  </Select>
                  {errors.grade_id && (
                    <FormHelperText>{errors.grade_id.message as string}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.date_of_birth}
                  helperText={errors.date_of_birth?.message as string}
                  {...register('date_of_birth', { required: 'Date of Birth is required' })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth error={!!errors.gender}>
                  <InputLabel shrink id="edit-gender-label">Gender</InputLabel>
                  <Select
                    labelId="edit-gender-label"
                    label="Gender"
                    defaultValue={student?.gender || ''}
                    {...register('gender')}
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                  {errors.gender && (
                    <FormHelperText>{errors.gender.message as string}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Primary Contact"
                  placeholder="9876543210"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                  onKeyDown={handleNumericKeyDown}
                  error={!!errors.contact_number}
                  helperText={errors.contact_number?.message as string || '10-digit mobile number'}
                  {...register('contact_number', phoneValidationRule)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Father Name"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.father_name}
                  helperText={errors.father_name?.message as string}
                  {...register('father_name')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Father Contact Number"
                  placeholder="9876543210"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                  onKeyDown={handleNumericKeyDown}
                  error={!!errors.father_contact_number}
                  helperText={errors.father_contact_number?.message as string || '10-digit mobile number'}
                  {...register('father_contact_number', phoneValidationRule)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mother Name"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.mother_name}
                  helperText={errors.mother_name?.message as string}
                  {...register('mother_name')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mother Contact Number"
                  placeholder="9876543210"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                  onKeyDown={handleNumericKeyDown}
                  error={!!errors.mother_contact_number}
                  helperText={errors.mother_contact_number?.message as string || '10-digit mobile number'}
                  {...register('mother_contact_number', phoneValidationRule)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  placeholder="guardian@example.com"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.email}
                  helperText={errors.email?.message as string}
                  {...register('email', emailValidationRule)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Address"
                  multiline
                  rows={2}
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.address}
                  helperText={errors.address?.message as string}
                  {...register('address')}
                />
              </Grid>
            </Grid>
          </form>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button
            type="submit"
            form="edit-student-form"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
