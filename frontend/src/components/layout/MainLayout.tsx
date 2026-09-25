import { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useThemeContext } from '../../theme/ThemeContext';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { getLicenseStatus, LicenseInfo } from '../../services/license';
import LicenseBanner from '../licensing/LicenseBanner';
import LicenseUploadModal from '../licensing/LicenseUploadModal';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import ClassIcon from '@mui/icons-material/Class';
import PaymentIcon from '@mui/icons-material/Payment';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import PolicyIcon from '@mui/icons-material/Policy';
import SchoolIcon from '@mui/icons-material/School';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DescriptionIcon from '@mui/icons-material/Description';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

const drawerWidth = 260;

const menuSections = [
  {
    title: 'GENERAL',
    items: [
      { text: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/dashboard' },
    ],
  },
  {
    title: 'STUDENT MANAGEMENT',
    items: [
      { text: 'Student Directory', icon: <PeopleIcon fontSize="small" />, path: '/students' },
      { text: 'New Admission', icon: <PersonAddIcon fontSize="small" />, path: '/students/new' },
    ],
  },
  {
    title: 'FINANCE & BILLING',
    items: [
      { text: 'Fee Collection (POS)', icon: <PaymentIcon fontSize="small" />, path: '/finance/fee-collection' },
      { text: 'Fee Assignments', icon: <ReceiptIcon fontSize="small" />, path: '/finance/fee-assignments' },
      { text: 'Payment History', icon: <HistoryIcon fontSize="small" />, path: '/finance/payment-history' },
      { text: 'Financial Reports', icon: <AssessmentIcon fontSize="small" />, path: '/reports' },
    ],
  },
  {
    title: 'DOCUMENTS & LETTERS',
    items: [
      { text: 'Hall Tickets', icon: <ConfirmationNumberIcon fontSize="small" />, path: '/hall-tickets' },
      { text: 'Artifacts', icon: <DescriptionIcon fontSize="small" />, path: '/artifacts' },
    ],
  },
  {
    title: 'MASTER DATA',
    items: [
      { text: 'Academic Years', icon: <SchoolIcon fontSize="small" />, path: '/master/academic-years' },
      { text: 'Grades & Sections', icon: <ClassIcon fontSize="small" />, path: '/master/grades' },
      { text: 'Fee Categories', icon: <CategoryIcon fontSize="small" />, path: '/master/fee-categories' },
      { text: 'Discount Types', icon: <LocalOfferIcon fontSize="small" />, path: '/master/discount-types' },
    ],
  },
  {
    title: 'SYSTEM & ADMIN',
    items: [
      { text: 'System Settings', icon: <SettingsIcon fontSize="small" />, path: '/admin/settings' },
      { text: 'User Management', icon: <ManageAccountsIcon fontSize="small" />, path: '/admin/users' },
      { text: 'Audit Logs', icon: <PolicyIcon fontSize="small" />, path: '/admin/audit-logs' },
      { text: 'My Profile', icon: <SecurityIcon fontSize="small" />, path: '/admin/profile' },
    ],
  },
];

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeContext();

  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);

  useEffect(() => {
    getLicenseStatus()
      .then(setLicense)
      .catch(() => {});
  }, [location.pathname]);

  const userStr = localStorage.getItem('user');
  const user = useMemo(() => {
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }, [userStr]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Find active page title for the header breadcrumb
  const currentPageTitle = useMemo(() => {
    for (const section of menuSections) {
      const match = section.items.find(
        (item) => item.path === location.pathname || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
      );
      if (match) return { section: section.title, title: match.text };
    }
    if (location.pathname.startsWith('/students/')) return { section: 'STUDENT MANAGEMENT', title: 'Student Profile' };
    return { section: 'PORTAL', title: 'Overview' };
  }, [location.pathname]);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            overflow: 'hidden',
            flexShrink: 0,
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
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            noWrap
            sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}
          >
            Pragati Vidyalaya
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.4 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '0.625rem',
                letterSpacing: '0.06em',
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.09),
                px: 0.75,
                py: 0.2,
                borderRadius: '5px',
              }}
            >
              FEE ERP v2.0
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mx: 2, my: 0.5 }} />

      {/* Navigation Links */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1, py: 1 }}>
        {menuSections.map((section) => (
          <Box key={section.title} sx={{ mb: 1.5 }}>
            <Typography
              variant="overline"
              sx={{
                px: 2,
                py: 0.5,
                display: 'block',
                color: 'text.secondary',
                fontSize: '0.675rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              {section.title}
            </Typography>
            <List disablePadding>
              {section.items.map((item) => {
                const isSelected =
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.3 }}>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => {
                        navigate(item.path);
                        if (mobileOpen) setMobileOpen(false);
                      }}
                      sx={{
                        borderRadius: '10px',
                        py: 0.85,
                        px: 1.75,
                        position: 'relative',
                        transition: 'all 0.15s ease-in-out',
                        ...(isSelected
                          ? {
                              bgcolor:
                                mode === 'dark'
                                  ? alpha(theme.palette.primary.main, 0.18)
                                  : alpha(theme.palette.primary.main, 0.09),
                              color: 'primary.main',
                              fontWeight: 700,
                              '&:hover': {
                                bgcolor:
                                  mode === 'dark'
                                    ? alpha(theme.palette.primary.main, 0.24)
                                    : alpha(theme.palette.primary.main, 0.14),
                              },
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                left: 4,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 3.5,
                                height: 20,
                                borderRadius: 4,
                                bgcolor: 'primary.main',
                              },
                            }
                          : {
                              color: 'text.secondary',
                              '&:hover': {
                                bgcolor: alpha(theme.palette.text.primary, 0.04),
                                color: 'text.primary',
                              },
                            }),
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 34,
                          color: isSelected ? 'primary.main' : 'inherit',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: '0.84rem',
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* User Footer Profile */}
      <Box
        sx={{
          p: 1.5,
          m: 1.5,
          borderRadius: '12px',
          bgcolor: mode === 'dark' ? alpha(theme.palette.common.white, 0.04) : alpha(theme.palette.common.black, 0.02),
          border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: '0.875rem',
            fontWeight: 700,
          }}
        >
          {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
        </Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {user?.username || 'Administrator'}
          </Typography>
          <Typography variant="caption" noWrap color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
            {user?.email || 'admin@school.com'}
          </Typography>
        </Box>
        <Tooltip title="Log out" arrow>
          <IconButton size="small" onClick={handleLogout} color="error" sx={{ borderRadius: '8px' }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />

      {/* Modern Top App Bar with Glassmorphism */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: mode === 'dark' ? alpha('#0b0f19', 0.85) : alpha('#ffffff', 0.88),
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Breadcrumb / Title */}
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 600,
                fontSize: '0.675rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {currentPageTitle.section}
            </Typography>
            <Typography
              variant="h6"
              component="h1"
              noWrap
              sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.15rem' }, letterSpacing: '-0.01em' }}
            >
              {currentPageTitle.title}
            </Typography>
          </Box>

          {/* Header Action Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* License Expiry Badge */}
            {license && (
              <Tooltip
                title={
                  license.expires_at
                    ? `License: Valid until ${new Date(license.expires_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} (${license.days_remaining} days left). Click to manage.`
                    : 'License: Not activated. Click to activate.'
                }
                arrow
              >
                <Chip
                  icon={
                    license.status === 'ACTIVE' ? (
                      <VerifiedUserIcon style={{ fontSize: '0.9rem', color: '#10b981' }} />
                    ) : license.status === 'EXPIRING_SOON' ? (
                      <WarningAmberIcon style={{ fontSize: '0.9rem', color: '#f59e0b' }} />
                    ) : (
                      <ErrorOutlineIcon style={{ fontSize: '0.9rem', color: '#ef4444' }} />
                    )
                  }
                  label={
                    license.expires_at
                      ? `Valid till: ${new Date(license.expires_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : 'Unlicensed'
                  }
                  size="small"
                  variant="outlined"
                  onClick={() => setLicenseModalOpen(true)}
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    cursor: 'pointer',
                    borderColor:
                      license.status === 'ACTIVE'
                        ? alpha('#10b981', 0.4)
                        : license.status === 'EXPIRING_SOON'
                        ? alpha('#f59e0b', 0.5)
                        : alpha('#ef4444', 0.5),
                    bgcolor:
                      license.status === 'ACTIVE'
                        ? alpha('#10b981', 0.06)
                        : license.status === 'EXPIRING_SOON'
                        ? alpha('#f59e0b', 0.08)
                        : alpha('#ef4444', 0.08),
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor:
                        license.status === 'ACTIVE'
                          ? alpha('#10b981', 0.12)
                          : alpha('#f59e0b', 0.15),
                    },
                  }}
                />
              </Tooltip>
            )}

            {/* Academic Session Pill */}
            <Chip
              icon={<AccountBalanceWalletIcon style={{ fontSize: '0.9rem', color: theme.palette.primary.main }} />}
              label="Active Term"
              size="small"
              variant="outlined"
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                borderColor: alpha(theme.palette.primary.main, 0.3),
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                fontWeight: 600,
                fontSize: '0.75rem',
                color: 'text.primary',
              }}
            />

            {/* Dark / Light Mode Toggle */}
            <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} arrow>
              <IconButton
                onClick={toggleTheme}
                color="inherit"
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '10px',
                  width: 38,
                  height: 38,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                  },
                }}
              >
                {mode === 'dark' ? (
                  <LightModeIcon sx={{ fontSize: 20, color: '#fbbf24' }} />
                ) : (
                  <DarkModeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawers */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation folders"
      >
        {/* Mobile Temporary Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: mode === 'dark' ? '#0e1526' : '#ffffff',
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: mode === 'dark' ? '#0e1526' : '#ffffff',
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 3.5 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar sx={{ minHeight: 64 }} />
        <LicenseBanner license={license} onLicenseRenewed={(newInfo) => setLicense(newInfo)} />
        <Outlet />
      </Box>

      <LicenseUploadModal
        open={licenseModalOpen}
        onClose={() => setLicenseModalOpen(false)}
        currentServerId={license?.current_server_id || ''}
        onLicenseActivated={(newInfo) => setLicense(newInfo)}
      />
    </Box>
  );
}

