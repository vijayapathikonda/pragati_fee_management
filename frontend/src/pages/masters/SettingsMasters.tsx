import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { GridColDef } from '@mui/x-data-grid';
import { Box, TextField, Button, DialogActions } from '@mui/material';
import MasterCrudView from '../../components/master/MasterCrudView';

export const ApplicationSettings = () => {
  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'setting_key', headerName: 'Key', width: 250 },
    { field: 'setting_value', headerName: 'Value', flex: 1 },
  ];

  const SettingForm = ({ data, onSubmit, onCancel }: any) => {
    const { register, handleSubmit, reset } = useForm({
      defaultValues: data || { setting_key: '', setting_value: '' }
    });
    useEffect(() => { if (data) reset(data); }, [data, reset]);
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Setting Key" {...register('setting_key', { required: true })} fullWidth required disabled={!!data} />
          <TextField label="Setting Value" {...register('setting_value', { required: true })} fullWidth required multiline rows={3} />
        </Box>
        <DialogActions sx={{ px: 0, pb: 0, pt: 3 }}><Button onClick={onCancel}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
      </form>
    );
  };

  return <MasterCrudView title="Application Settings" endpoint="/masters/application-settings" columns={columns} FormComponent={SettingForm} />;
};

export const SchoolInformation = () => {
  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'School Name', width: 250 },
    { field: 'contact_email', headerName: 'Email', width: 200 },
    { field: 'contact_phone', headerName: 'Phone', width: 150 },
  ];

  const SchoolInfoForm = ({ data, onSubmit, onCancel }: any) => {
    const { register, handleSubmit, reset } = useForm({
      defaultValues: data || { name: '', address: '', contact_email: '', contact_phone: '', logo_url: '' }
    });
    useEffect(() => { if (data) reset(data); }, [data, reset]);
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="School Name" {...register('name', { required: true })} fullWidth required />
          <TextField label="Address" {...register('address')} fullWidth multiline rows={2} />
          <TextField label="Contact Email" {...register('contact_email')} fullWidth />
          <TextField label="Contact Phone" {...register('contact_phone')} fullWidth />
          <TextField label="Logo URL" {...register('logo_url')} fullWidth />
        </Box>
        <DialogActions sx={{ px: 0, pb: 0, pt: 3 }}><Button onClick={onCancel}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
      </form>
    );
  };

  return <MasterCrudView title="School Information" endpoint="/masters/school-information" columns={columns} FormComponent={SchoolInfoForm} />;
};
