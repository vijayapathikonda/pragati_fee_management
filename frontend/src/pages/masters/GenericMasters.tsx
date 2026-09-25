import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { GridColDef } from '@mui/x-data-grid';
import { Box, TextField, Button, DialogActions } from '@mui/material';
import MasterCrudView from '../../components/master/MasterCrudView';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Name', width: 200 },
  { field: 'description', headerName: 'Description', flex: 1 },
];

const GenericForm = ({ data, onSubmit, onCancel }: any) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: data || { name: '', description: '' }
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label="Name"
          {...register('name', { required: true })}
          fullWidth
          required
        />
        <TextField
          label="Description"
          {...register('description')}
          fullWidth
          multiline
          rows={3}
        />
      </Box>
      <DialogActions sx={{ px: 0, pb: 0, pt: 3 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="contained">Save</Button>
      </DialogActions>
    </form>
  );
};

export const Grades = () => (
  <MasterCrudView title="Grades" endpoint="/masters/grades" columns={columns} FormComponent={GenericForm} />
);

export const Sections = () => (
  <MasterCrudView title="Sections" endpoint="/masters/sections" columns={columns} FormComponent={GenericForm} />
);
