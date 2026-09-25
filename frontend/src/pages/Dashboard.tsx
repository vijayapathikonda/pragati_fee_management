import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material';
import Chart from 'react-apexcharts';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import api from '../services/api';
import { getDashboardSummary } from '../services/dashboard';

const formatCurrency = (val: number | string) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export default function Dashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [selectedAy, setSelectedAy] = useState<number | 'all'>('all');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedSection, setSelectedSection] = useState<number | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Load filter master data
    Promise.all([
      api.get('/masters/academic-years?size=100&sort_by=id&sort_order=asc'),
      api.get('/masters/grades?size=100&sort_by=id&sort_order=asc'),
      api.get('/masters/sections?size=100&sort_by=id&sort_order=asc'),
    ]).then(([ayRes, grRes, secRes]) => {
      setAcademicYears(ayRes.data.data);
      setGrades(grRes.data.data);
      setSections(secRes.data.data);

      const activeAy = ayRes.data.data.find((a: any) => a.is_active);
      if (activeAy) {
        setSelectedAy(activeAy.id);
      } else {
        loadSummary();
      }
    });
  }, []);

  useEffect(() => {
    if (selectedAy) {
      loadSummary();
    }
  }, [selectedAy, selectedGrade, selectedSection, startDate, endDate]);

  const loadSummary = () => {
    setLoading(true);
    const params: any = {};
    if (selectedAy && selectedAy !== 'all') params.academic_year_id = selectedAy;
    if (selectedGrade && selectedGrade !== 'all') params.grade_id = selectedGrade;
    if (selectedSection && selectedSection !== 'all') params.section_id = selectedSection;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    getDashboardSummary(params)
      .then((res) => {
        setData(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Modern Chart Theme Configurations
  const chartPalette = useMemo(
    () => ['#4f46e5', '#10b981', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6'],
    []
  );

  const areaOptions = (categories: string[]): any => ({
    chart: {
      type: 'area',
      fontFamily: theme.typography.fontFamily,
      toolbar: { show: false },
      zoom: { enabled: false },
      background: 'transparent',
    },
    colors: ['#4f46e5'],
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: isDark ? 0.5 : 0.35,
        opacityTo: 0.05,
        stops: [0, 95, 100],
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontSize: '11px',
          fontWeight: 500,
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontSize: '11px',
          fontWeight: 500,
        },
        formatter: (val: number) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`,
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val: number) => formatCurrency(val),
      },
    },
  });

  const donutOptions = (labels: string[]): any => ({
    chart: {
      type: 'donut',
      fontFamily: theme.typography.fontFamily,
      background: 'transparent',
    },
    colors: chartPalette,
    labels: labels,
    stroke: {
      width: 2,
      colors: [theme.palette.background.paper],
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              color: theme.palette.text.secondary,
              fontSize: '13px',
              fontWeight: 600,
            },
          },
        },
      },
    },
    legend: {
      position: 'bottom',
      labels: { colors: theme.palette.text.primary },
      fontSize: '12px',
      fontWeight: 500,
    },
    dataLabels: { enabled: false },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val: number) => `₹${val.toLocaleString()}`,
      },
    },
  });

  const barOptions = (categories: string[], barColor: string): any => ({
    chart: {
      type: 'bar',
      fontFamily: theme.typography.fontFamily,
      toolbar: { show: false },
      background: 'transparent',
    },
    colors: [barColor],
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '45%',
        distributed: false,
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 4,
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontSize: '11px',
          fontWeight: 500,
        },
        rotate: -30,
        trim: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontSize: '11px',
          fontWeight: 500,
        },
        formatter: (val: number) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`,
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val: number) => formatCurrency(val),
      },
    },
  });

  if (loading && !data) {
    return (
      <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={220} height={40} />
          <Skeleton variant="text" width={340} height={20} />
        </Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={130} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rounded" height={360} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rounded" height={360} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  const { cards, charts, lists } = data || {
    cards: { total_students: 0, active_students: 0, today_collection: 0, monthly_collection: 0, outstanding_amount: 0 },
    charts: {
      daily_collection: { labels: [], series: [] },
      payment_mode_distribution: { labels: [], series: [] },
      category_collection: { labels: [], series: [] },
      category_outstanding: { labels: [], series: [] },
    },
    lists: { top_defaulters: [], recent_payments: [] },
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', pb: 6 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'text.primary' }}>
            Executive Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            High-level overview of student enrollment, revenue collections, and outstanding dues.
          </Typography>
        </Box>
      </Box>

      {/* Filter Toolbar */}
      <Paper
        sx={{
          p: 2,
          mb: 3.5,
          borderRadius: 3,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>Academic Year</InputLabel>
              <Select
                value={selectedAy}
                label="Academic Year"
                onChange={(e) => setSelectedAy(e.target.value as any)}
              >
                <MenuItem value="all"><em>All Years</em></MenuItem>
                {academicYears.map((ay) => (
                  <MenuItem key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_active ? ' (Active)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>Grade</InputLabel>
              <Select
                value={selectedGrade}
                label="Grade"
                onChange={(e) => setSelectedGrade(e.target.value as any)}
              >
                <MenuItem value="all"><em>All Grades</em></MenuItem>
                {grades.map((g) => (
                  <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <InputLabel>Section</InputLabel>
              <Select
                value={selectedSection}
                label="Section"
                onChange={(e) => setSelectedSection(e.target.value as any)}
              >
                <MenuItem value="all"><em>All Sections</em></MenuItem>
                {sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              size="small"
              label="From Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              size="small"
              label="To Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Modern KPI Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Card 1: Students */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 3.5,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(79, 70, 229, 0.08)',
              },
            }}
          >
            <CardContent sx={{ p: 2.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Student Enrollment
                </Typography>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '10px',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PeopleAltOutlinedIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.75 }}>
                {cards.active_students}{' '}
                <Typography component="span" variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
                  / {cards.total_students}
                </Typography>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Chip
                  label="Active vs Total"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Today's Collection */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 3.5,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(16, 185, 129, 0.08)',
              },
            }}
          >
            <CardContent sx={{ p: 2.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Today's Collection
                </Typography>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '10px',
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PaymentsOutlinedIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'success.main', mb: 0.75 }}>
                {formatCurrency(cards.today_collection)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Chip
                  icon={<TrendingUpOutlinedIcon style={{ fontSize: '0.85rem' }} />}
                  label="Daily Cashflow"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: 'success.main',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Monthly Collection */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 3.5,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(2, 132, 199, 0.08)',
              },
            }}
          >
            <CardContent sx={{ p: 2.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Monthly Inflow
                </Typography>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '10px',
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: 'info.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AccountBalanceWalletOutlinedIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.75 }}>
                {formatCurrency(cards.monthly_collection)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Chip
                  label="Current Month"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: 'info.main',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Total Outstanding */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 3.5,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(225, 29, 72, 0.08)',
              },
            }}
          >
            <CardContent sx={{ p: 2.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Total Dues Outstanding
                </Typography>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '10px',
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <WarningAmberOutlinedIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'error.main', mb: 0.75 }}>
                {formatCurrency(cards.outstanding_amount)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Chip
                  label="Uncollected Fees"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: 'error.main',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Primary Analytics Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Daily Collection Area Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: '100%', borderRadius: 3.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Daily Revenue Trends
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Collection pattern across the past 7 days
                </Typography>
              </Box>
            </Box>
            <Box sx={{ minHeight: 310 }}>
              <Chart
                options={areaOptions(charts.daily_collection.labels)}
                series={[{ name: 'Collection', data: charts.daily_collection.series }]}
                type="area"
                height={300}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Payment Modes Distribution Donut */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%', borderRadius: 3.5 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Payment Methods
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Breakdown by collection channel
              </Typography>
            </Box>
            <Box sx={{ minHeight: 310, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Chart
                options={donutOptions(charts.payment_mode_distribution.labels)}
                series={charts.payment_mode_distribution.series}
                type="donut"
                height={300}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Secondary Analytics: Categories */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Collection by Fee Category
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Revenue generated per assigned category
            </Typography>
            <Chart
              options={barOptions(charts.category_collection.labels, theme.palette.primary.main)}
              series={[{ name: 'Collected', data: charts.category_collection.series }]}
              type="bar"
              height={290}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Outstanding Balance by Category
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Dues waiting to be settled per category
            </Typography>
            <Chart
              options={barOptions(charts.category_outstanding.labels, theme.palette.error.main)}
              series={[{ name: 'Outstanding', data: charts.category_outstanding.series }]}
              type="bar"
              height={290}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Actionable Tables: Defaulters & Recent Payments */}
      <Grid container spacing={3}>
        {/* Top Defaulters Table */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: '100%', borderRadius: 3.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                  Critical Defaulters
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Students with highest pending dues
                </Typography>
              </Box>
              <Chip
                label={`${lists.top_defaulters.length} Defaulters`}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  color: 'error.main',
                  fontWeight: 600,
                  fontSize: '0.725rem',
                }}
              />
            </Box>

            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Due Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lists.top_defaulters.map((d: any) => (
                    <TableRow
                      key={d.student_id}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <TableCell sx={{ py: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              bgcolor: alpha(theme.palette.error.main, 0.15),
                              color: 'error.main',
                            }}
                          >
                            {d.student_name ? d.student_name.charAt(0).toUpperCase() : 'S'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {d.student_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ADM: {d.admission_number}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${d.grade} - ${d.section}`}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            borderColor: theme.palette.divider,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {formatCurrency(d.outstanding_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {lists.top_defaulters.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        No pending defaulters found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Payments Table */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: '100%', borderRadius: 3.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                  Recent Transactions
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Real-time log of confirmed receipt payments
                </Typography>
              </Box>
              <Chip
                label="Latest Records"
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  color: 'success.main',
                  fontWeight: 600,
                  fontSize: '0.725rem',
                }}
              />
            </Box>

            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Channel</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lists.recent_payments.map((r: any) => (
                    <TableRow
                      key={r.id}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <TableCell sx={{ py: 1.25, fontSize: '0.8rem', color: 'text.secondary' }}>
                        {r.date}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{r.student_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.mode}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor:
                              r.mode === 'Cash'
                                ? alpha(theme.palette.success.main, 0.1)
                                : r.mode === 'UPI'
                                ? alpha(theme.palette.info.main, 0.1)
                                : alpha(theme.palette.secondary.main, 0.1),
                            color:
                              r.mode === 'Cash'
                                ? 'success.main'
                                : r.mode === 'UPI'
                                ? 'info.main'
                                : 'text.primary',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                        +{formatCurrency(r.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {lists.recent_payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        No recent payments recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

