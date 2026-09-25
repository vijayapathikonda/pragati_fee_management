import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { GridColDef } from '@mui/x-data-grid';
import { Box, TextField, FormControlLabel, Switch, Button, DialogActions } from '@mui/material';
import MasterCrudView from '../../components/master/MasterCrudView';

const activeColumns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Name', width: 200 },
  { field: 'description', headerName: 'Description', flex: 1 },
  { field: 'is_active', headerName: 'Active', type: 'boolean', width: 100 },
];

const ActiveForm = ({ data, onSubmit, onCancel }: any) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: data || { name: '', description: '', is_active: true }
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField label="Name" {...register('name', { required: true })} fullWidth required />
        <TextField label="Description" {...register('description')} fullWidth multiline rows={3} />
        <FormControlLabel control={<Switch {...register('is_active')} defaultChecked={data?.is_active ?? true} />} label="Is Active" />
      </Box>
      <DialogActions sx={{ px: 0, pb: 0, pt: 3 }}><Button onClick={onCancel}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
    </form>
  );
};

export const FeeCategories = () => (
  <MasterCrudView title="Fee Categories" endpoint="/masters/fee-categories" columns={activeColumns} FormComponent={ActiveForm} />
);

export const DiscountTypes = () => {
  const discountCols: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'percentage', headerName: 'Percentage (%)', width: 130 },
    { field: 'flat_amount', headerName: 'Flat Amount', width: 130 },
    { field: 'is_active', headerName: 'Active', type: 'boolean', width: 100 },
  ];

  const DiscountForm = ({ data, onSubmit, onCancel }: any) => {
    const { register, handleSubmit, reset } = useForm({
      defaultValues: data || { name: '', description: '', percentage: 0, flat_amount: 0, is_active: true }
    });
    useEffect(() => { if (data) reset(data); }, [data, reset]);
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Name" {...register('name', { required: true })} fullWidth required />
          <TextField label="Description" {...register('description')} fullWidth />
          <TextField label="Percentage" type="number" {...register('percentage')} fullWidth />
          <TextField label="Flat Amount" type="number" {...register('flat_amount')} fullWidth />
          <FormControlLabel control={<Switch {...register('is_active')} defaultChecked={data?.is_active ?? true} />} label="Is Active" />
        </Box>
        <DialogActions sx={{ px: 0, pb: 0, pt: 3 }}><Button onClick={onCancel}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
      </form>
    );
  };

  return <MasterCrudView title="Discount Types" endpoint="/masters/discount-types" columns={discountCols} FormComponent={DiscountForm} />;
};

export const PaymentModes = () => {
  const paymentCols: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'is_active', headerName: 'Active', type: 'boolean', width: 100 },
  ];

  const PaymentForm = ({ data, onSubmit, onCancel }: any) => {
    const { register, handleSubmit, reset } = useForm({
      defaultValues: data || { name: '', is_active: true }
    });
    useEffect(() => { if (data) reset(data); }, [data, reset]);
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Name" {...register('name', { required: true })} fullWidth required />
          <FormControlLabel control={<Switch {...register('is_active')} defaultChecked={data?.is_active ?? true} />} label="Is Active" />
        </Box>
        <DialogActions sx={{ px: 0, pb: 0, pt: 3 }}><Button onClick={onCancel}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
      </form>
    );
  };

  return <MasterCrudView title="Payment Modes" endpoint="/masters/payment-modes" columns={paymentCols} FormComponent={PaymentForm} />;
};

export const LateFeeRules = () => {
  const lateFeeCols: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'grace_period_days', headerName: 'Grace Period (Days)', width: 150 },
    { field: 'penalty_amount', headerName: 'Penalty Amt', width: 130 },
    { field: 'penalty_percentage', headerName: 'Penalty %', width: 130 },
    { field: 'is_active', headerName: 'Active', type: 'boolean', width: 100 },
  ];

  const LateFeeForm = ({ data, onSubmit, onCancel }: any) => {
    const { register, handleSubmit, reset } = useForm({
      defaultValues: data || { name: '', grace_period_days: 0, penalty_amount: 0, penalty_percentage: 0, is_active: true }
    });
    useEffect(() => { if (data) reset(data); }, [data, reset]);
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Name" {...register('name', { required: true })} fullWidth required />
          <TextField label="Grace Period (Days)" type="number" {...register('grace_period_days')} fullWidth />
          <TextField label="Penalty Amount" type="number" {...register('penalty_amount')} fullWidth />
          <TextField label="Penalty Percentage" type="number" {...register('penalty_percentage')} fullWidth />
          <FormControlLabel control={<Switch {...register('is_active')} defaultChecked={data?.is_active ?? true} />} label="Is Active" />
        </Box>
        <DialogActions sx={{ px: 0, pb: 0, pt: 3 }}><Button onClick={onCancel}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
      </form>
    );
  };

  return <MasterCrudView title="Late Fee Rules" endpoint="/masters/late-fee-rules" columns={lateFeeCols} FormComponent={LateFeeForm} />;
};
