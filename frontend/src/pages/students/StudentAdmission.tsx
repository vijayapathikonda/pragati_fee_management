import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box, Button, Paper, TextField, Typography, Grid,
  MenuItem, Select, FormControl, InputLabel, Alert, FormHelperText
} from '@mui/material';
import api from '../../services/api';
import { createStudent, uploadStudentPhoto } from '../../services/student';

export default function StudentAdmission() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm({
    mode: 'onTouched'
  });
  
  const [academicYears, setAcademicYears] = useState([]);
  const [grades, setGrades] = useState([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    api.get('/masters/academic-years?size=100&sort_by=id&sort_order=asc').then(res => setAcademicYears(res.data.data));
    api.get('/masters/grades?size=100&sort_by=id&sort_order=asc').then(res => setGrades(res.data.data));
  }, []);

  // Keystroke handler for numeric-only inputs (phone numbers & serial number)
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

  const onSubmit = async (formData: any) => {
    setErrorMsg('');
    clearErrors();

    try {
      // 1. Sanitize payload
      const payload: any = { ...formData };

      if (payload.academic_year_id) {
        payload.academic_year_id = Number(payload.academic_year_id);
      }
      if (payload.grade_id) {
        payload.grade_id = Number(payload.grade_id);
      }

      // Convert empty strings to null or remove optional keys
      if (payload.serial_number === undefined || payload.serial_number === null || payload.serial_number === '') {
        delete payload.serial_number;
      } else {
        payload.serial_number = Number(payload.serial_number);
      }

      if (!payload.email || payload.email.trim() === '') {
        delete payload.email;
      } else {
        payload.email = payload.email.trim();
      }

      const stringFields = [
        'first_name', 'last_name', 'admission_number', 'contact_number',
        'father_name', 'father_contact_number', 'mother_name', 'mother_contact_number',
        'address', 'gender'
      ];

      for (const field of stringFields) {
        if (payload[field] !== undefined) {
          const val = typeof payload[field] === 'string' ? payload[field].trim() : payload[field];
          if (!val) {
            delete payload[field];
          } else {
            payload[field] = val;
          }
        }
      }

      // 2. Create Student
      const student = await createStudent(payload);
      
      // 3. Upload Photo if selected
      if (photo) {
        try {
          await uploadStudentPhoto(student.id, photo);
        } catch (photoErr) {
          console.warn('Photo upload failed after student creation:', photoErr);
        }
      }
      
      navigate(`/students/${student.id}`);
    } catch (error: any) {
      console.error('Admission failed', error);
      const responseData = error?.response?.data;

      if (responseData) {
        if (responseData.errors && typeof responseData.errors === 'object' && !Array.isArray(responseData.errors)) {
          Object.entries(responseData.errors).forEach(([field, message]) => {
            setError(field as any, { type: 'server', message: message as string });
          });
          setErrorMsg(responseData.detail || 'Please correct the highlighted fields.');
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
          setErrorMsg(msgs.join('; ') || 'Validation failed. Please correct highlighted fields.');
        } else if (typeof responseData.detail === 'string') {
          setErrorMsg(responseData.detail);
        } else {
          setErrorMsg('Failed to create student record. Please verify all details.');
        }
      } else {
        setErrorMsg(error?.message || 'Server connection error. Please try again.');
      }
    }
  };

  const onInvalid = (fieldErrors: any) => {
    const firstKey = Object.keys(fieldErrors)[0];
    if (firstKey && fieldErrors[firstKey]?.message) {
      setErrorMsg(`Please check field: ${fieldErrors[firstKey].message}`);
    } else {
      setErrorMsg('Please fill in all required fields and correct any highlighted errors.');
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 850, mx: 'auto', pb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          New Student Admission
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Register a new student profile, assign grade, and record personal and guardian information.
        </Typography>
      </Box>
      
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}
      
      <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 3.5 }}>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700 }}>
                1. Academic Enrollment
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!errors.academic_year_id}>
                <InputLabel id="academic-year-label">Academic Year</InputLabel>
                <Select
                  labelId="academic-year-label"
                  label="Academic Year"
                  defaultValue=""
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
                <InputLabel id="grade-label">Grade</InputLabel>
                <Select
                  labelId="grade-label"
                  label="Grade"
                  defaultValue=""
                  {...register('grade_id', { required: 'Grade is required' })}
                >
                  {grades.map((g: any) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                </Select>
                {errors.grade_id && (
                  <FormHelperText>{errors.grade_id.message as string}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2, fontWeight: 700 }}>
                2. Basic Identification
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Serial Number (SN)"
                type="text"
                placeholder="e.g. 1"
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
                label="Admission Number"
                placeholder="Auto-generated if blank"
                error={!!errors.admission_number}
                helperText={errors.admission_number?.message as string || 'Auto-generated if blank'}
                {...register('admission_number')}
              />
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Student First Name"
                error={!!errors.first_name}
                helperText={errors.first_name?.message as string}
                {...register('first_name', {
                  required: 'Student First Name is required',
                  validate: (val) => (val && val.trim() !== '') || 'First Name cannot be blank'
                })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Student Last Name"
                error={!!errors.last_name}
                helperText={errors.last_name?.message as string}
                {...register('last_name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.gender}>
                <InputLabel id="gender-label">Gender</InputLabel>
                <Select
                  labelId="gender-label"
                  label="Gender"
                  defaultValue=""
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Primary Contact Number"
                placeholder="9876543210"
                inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                onKeyDown={handleNumericKeyDown}
                error={!!errors.contact_number}
                helperText={errors.contact_number?.message as string || '10-digit mobile number'}
                {...register('contact_number', phoneValidationRule)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2, fontWeight: 700 }}>
                3. Parent & Guardian Details
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Father Name"
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
                error={!!errors.email}
                helperText={errors.email?.message as string}
                {...register('email', emailValidationRule)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Residential Address"
                multiline
                rows={2}
                error={!!errors.address}
                helperText={errors.address?.message as string}
                {...register('address')}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2, fontWeight: 700 }}>
                4. Identity Photo
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                <input
                  accept="image/*"
                  type="file"
                  id="student-photo-upload"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPhoto(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="student-photo-upload">
                  <Button variant="outlined" component="span" sx={{ borderRadius: 2 }}>
                    {photo ? `Selected: ${photo.name}` : 'Choose Student Photo'}
                  </Button>
                </label>
              </Box>
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button onClick={() => navigate('/students')} variant="outlined" sx={{ borderRadius: 2 }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ borderRadius: 2, px: 3 }}>
                {isSubmitting ? 'Saving Enrollment...' : 'Complete Admission'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}
