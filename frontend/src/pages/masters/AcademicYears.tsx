import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { GridColDef } from '@mui/x-data-grid';
import { Box, TextField, FormControlLabel, Switch, Button, DialogActions } from '@mui/material';
import MasterCrudView from '../../components/master/MasterCrudView';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Name', width: 200 },
  { field: 'start_date', headerName: 'Start Date', width: 150 },
  { field: 'end_date', headerName: 'End Date', width: 150 },
  { field: 'is_active', headerName: 'Active', type: 'boolean', width: 100 },
];

const AcademicYearForm = ({ data, onSubmit, onCancel }: any) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: data || { name: '', start_date: '', end_date: '', is_active: true }
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label="Name (e.g. 2023-2024)"
          {...register('name', { required: true })}
          fullWidth
          required
        />
        <TextField
          label="Start Date"
          type="date"
          {...register('start_date', { required: true })}
          fullWidth
          InputLabelProps={{ shrink: true }}
          required
        />
        <TextField
          label="End Date"
          type="date"
          {...register('end_date', { required: true })}
          fullWidth
          InputLabelProps={{ shrink: true }}
          required
        />
        <FormControlLabel
          control={<Switch {...register('is_active')} defaultChecked={data?.is_active ?? true} />}
          label="Is Active"
        />
      </Box>
      <DialogActions sx={{ px: 0, pb: 0, pt: 3 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="contained">Save</Button>
      </DialogActions>
    </form>
  );
};

export default function AcademicYears() {
  return (
    <MasterCrudView
      title="Academic Years"
      endpoint="/masters/academic-years"
      columns={columns}
      FormComponent={AcademicYearForm}
    />
  );
}
