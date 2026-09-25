import React, { useState, useEffect } from 'react';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import api from '../services/api';
import { getStudents } from '../services/student';

interface StudentSelectorProps {
  onStudentSelect: (studentId: number | '') => void;
  selectedStudentId?: number | '';
}

export default function StudentSelector({ onStudentSelect, selectedStudentId = '' }: StudentSelectorProps) {
  // Master Data
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);

  // Filter State
  const [academicYearId, setAcademicYearId] = useState<string>('all');
  const [gradeId, setGradeId] = useState<string>('all');

  // Autocomplete State
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // The currently selected student object
  const [value, setValue] = useState<any | null>(null);

  // Fetch Master Data on Mount
  useEffect(() => {
    api.get('/masters/academic-years?size=100').then(res => setAcademicYears(res.data.data || []));
    api.get('/masters/grades?size=100').then(res => setGrades(res.data.data || []));
  }, []);

  // Fetch Students based on filters and search input
  useEffect(() => {
    let active = true;

    setLoading(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const params: any = {
          page: 1,
          size: 50,
          search: inputValue || undefined,
          academic_year_id: academicYearId === 'all' ? undefined : academicYearId,
          grade_id: gradeId === 'all' ? undefined : gradeId,
        };
        const response = await getStudents(params);
        if (active) {
          setOptions(response.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch students', error);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [inputValue, academicYearId, gradeId, value]);

  // Handle external selectedStudentId changes (e.g. resets)
  useEffect(() => {
    if (!selectedStudentId) {
      setValue(null);
    }
  }, [selectedStudentId]);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Academic Year</InputLabel>
          <Select
            value={academicYearId}
            label="Academic Year"
            onChange={(e) => setAcademicYearId(e.target.value)}
          >
            <MenuItem value="all"><em>All Years</em></MenuItem>
            {academicYears.map((ay) => (
              <MenuItem key={ay.id} value={ay.id}>{ay.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={4} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Grade</InputLabel>
          <Select
            value={gradeId}
            label="Grade"
            onChange={(e) => setGradeId(e.target.value)}
          >
            <MenuItem value="all"><em>All Grades</em></MenuItem>
            {grades.map((g) => (
              <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={4} md={6}>
        <Autocomplete
          id="student-search"
          size="small"
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          isOptionEqualToValue={(option, val) => option.id === val.id}
          getOptionLabel={(option) => `${option.first_name} ${option.last_name || ''} (${option.admission_number}) - ${option.grade?.name || ''}`}
          options={options}
          loading={loading}
          value={value}
          onChange={(_, newValue) => {
            setValue(newValue);
            onStudentSelect(newValue ? newValue.id : '');
          }}
          onInputChange={(_, newInputValue) => {
            setInputValue(newInputValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Student"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}
            />
          )}
        />
      </Grid>
    </Grid>
  );
}
