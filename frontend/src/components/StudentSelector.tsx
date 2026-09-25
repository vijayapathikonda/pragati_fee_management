import React, { useState, useEffect, useRef } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  
  // The currently selected student object
  const [value, setValue] = useState<any | null>(null);
  const requestSeqRef = useRef(0);

  // Fetch Master Data on Mount
  useEffect(() => {
    api.get('/masters/academic-years?size=100&sort_by=id&sort_order=asc')
      .then(res => setAcademicYears(res.data.data || []))
      .catch(err => console.error('Failed to load academic years:', err));
    api.get('/masters/grades?size=100&sort_by=id&sort_order=asc')
      .then(res => setGrades(res.data.data || []))
      .catch(err => console.error('Failed to load grades:', err));
  }, []);

  // Fetch Students based on filters and typed search input (NOT the selected option's display label)
  useEffect(() => {
    const reqId = ++requestSeqRef.current;
    setLoading(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const params: any = {
          page: 1,
          size: 200,
          search: searchQuery.trim() || undefined,
          academic_year_id: academicYearId === 'all' ? undefined : Number(academicYearId),
          grade_id: gradeId === 'all' ? undefined : Number(gradeId),
        };
        const response = await getStudents(params);
        if (reqId === requestSeqRef.current) {
          setOptions(response.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch students', error);
      } finally {
        if (reqId === requestSeqRef.current) {
          setLoading(false);
        }
      }
    }, searchQuery ? 250 : 0);

    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [searchQuery, academicYearId, gradeId]);

  // Handle external selectedStudentId changes (e.g. resets)
  useEffect(() => {
    if (!selectedStudentId) {
      setValue(null);
      setInputValue('');
      setSearchQuery('');
    }
  }, [selectedStudentId]);

  const handleAcademicYearChange = (newYearId: string) => {
    setAcademicYearId(newYearId);
    setValue(null);
    setInputValue('');
    setSearchQuery('');
    onStudentSelect('');
  };

  const handleGradeChange = (newGradeId: string) => {
    setGradeId(newGradeId);
    setValue(null);
    setInputValue('');
    setSearchQuery('');
    onStudentSelect('');
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Academic Year</InputLabel>
          <Select
            value={academicYearId}
            label="Academic Year"
            onChange={(e) => handleAcademicYearChange(String(e.target.value))}
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
            onChange={(e) => handleGradeChange(String(e.target.value))}
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
          filterOptions={(x) => x}
          options={options}
          loading={loading}
          value={value}
          inputValue={inputValue}
          onChange={(_, newValue) => {
            setValue(newValue);
            setSearchQuery('');
            onStudentSelect(newValue ? newValue.id : '');
          }}
          onInputChange={(_, newInputValue, reason) => {
            setInputValue(newInputValue);
            if (reason === 'input') {
              setSearchQuery(newInputValue);
            } else if (reason === 'clear') {
              setSearchQuery('');
            }
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

