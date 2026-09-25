import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { login } from '../services/auth';
import { UserLogin } from '../types/auth';
import { useThemeContext } from '../theme/ThemeContext';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  IconButton,
  Grid,
  InputAdornment,
  CircularProgress,
  Chip,
  useTheme,
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

const Login = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { mode, toggleTheme } = useThemeContext();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserLogin>();

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem('token', data.token.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Invalid email or password');
    },
  });

  const onSubmit = (data: UserLogin) => {
    setErrorMsg('');
    loginMutation.mutate(data);
  };

  return (
    <Grid container component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Left side: Enterprise Showcase */}
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          background:
            mode === 'dark'
              ? 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e1b4b 100%)'
              : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
          position: 'relative',
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { sm: 4, md: 7 },
          color: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Subtle geometric background overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: '-15%',
            right: '-15%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              bgcolor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src="/logo.jpeg"
              alt="Pragati School Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Pragati Vidyalaya
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
              Institutional Management Systems
            </Typography>
          </Box>
        </Box>

        {/* Main Value Proposition */}
        <Box sx={{ my: 'auto', position: 'relative', zIndex: 1, maxWidth: 540 }}>
          <Chip
            icon={<ShieldOutlinedIcon style={{ fontSize: '0.9rem', color: '#818cf8' }} />}
            label="ENTERPRISE FINANCIAL SUITE"
            size="small"
            sx={{
              bgcolor: 'rgba(99, 102, 241, 0.2)',
              color: '#c7d2fe',
              fontWeight: 700,
              fontSize: '0.675rem',
              letterSpacing: '0.08em',
              mb: 2.5,
              border: '1px solid rgba(129, 140, 248, 0.3)',
            }}
          />
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              mb: 2,
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}
          >
            Streamlined school fees, automated receipts & instant reconciliation.
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6, mb: 4, fontSize: '1.05rem' }}
          >
            An all-in-one financial operations platform built for precision, automated ledger generation, and audit-grade financial controls.
          </Typography>

          {/* Key Capabilities Pills */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            {[
              'Real-time Defaulter Tracking & Notifications',
              'Automated GST & Multi-Mode Fee Receipts',
              'Class-wise Ledger & Term-wise Fee Breakdown',
            ].map((feature, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <CheckCircleOutlineRoundedIcon sx={{ color: '#34d399', fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                  {feature}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            © {new Date().getFullYear()} Pragati Vidyalaya. All rights reserved.
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Security Level: Enterprise 256-Bit
          </Typography>
        </Box>
      </Grid>

      {/* Right side: Login Form */}
      <Grid
        item
        xs={12}
        sm={8}
        md={5}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          bgcolor: 'background.default',
        }}
      >
        {/* Theme Toggle Button */}
        <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
          <IconButton
            onClick={toggleTheme}
            color="inherit"
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '10px',
              width: 40,
              height: 40,
            }}
          >
            {mode === 'dark' ? (
              <LightModeIcon sx={{ fontSize: 20, color: '#fbbf24' }} />
            ) : (
              <DarkModeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            )}
          </IconButton>
        </Box>

        {/* Center Container */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 3, sm: 5, md: 6 },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3.5, sm: 5 },
              width: '100%',
              maxWidth: 440,
              borderRadius: 4,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow:
                mode === 'dark'
                  ? '0 12px 36px 0 rgba(0, 0, 0, 0.4)'
                  : '0 12px 36px -4px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Header / Logo */}
            <Box sx={{ mb: 3.5 }}>
              <Typography
                variant="h5"
                component="h1"
                sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.75 }}
              >
                Sign in to your account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your administrative credentials to access the fee management portal.
              </Typography>
            </Box>

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {errorMsg}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                  Email Address
                </Typography>
                <TextField
                  fullWidth
                  id="email"
                  placeholder="name@school.com"
                  autoComplete="email"
                  autoFocus
                  {...register('email', { required: 'Email is required' })}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                  Password
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required' })}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                sx={{
                  py: 1.35,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: 2.5,
                }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={18} color="inherit" />
                    <span>Signing in...</span>
                  </Box>
                ) : (
                  'Sign In to Dashboard'
                )}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Grid>
    </Grid>
  );
};

export default Login;

