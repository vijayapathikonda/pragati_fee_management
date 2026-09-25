import { ThemeOptions, alpha, createTheme } from '@mui/material/styles';

const baseTypography = {
  fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '-0.025em',
    lineHeight: 1.25,
  },
  h3: {
    fontSize: '1.625rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
  },
  h4: {
    fontSize: '1.3125rem',
    fontWeight: 700,
    letterSpacing: '-0.015em',
    lineHeight: 1.35,
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.4,
  },
  h6: {
    fontSize: '0.975rem',
    fontWeight: 600,
    letterSpacing: '-0.005em',
    lineHeight: 1.45,
  },
  subtitle1: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  body1: {
    fontSize: '0.9375rem',
    lineHeight: 1.6,
    fontWeight: 400,
  },
  body2: {
    fontSize: '0.84375rem',
    lineHeight: 1.55,
    fontWeight: 400,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    letterSpacing: '0.01em',
    textTransform: 'none' as const,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.02em',
    lineHeight: 1.4,
  },
  overline: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
};

export const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#4f46e5', // Indigo 600
      light: '#818cf8', // Indigo 400
      dark: '#3730a3', // Indigo 800
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569', // Slate 600
      light: '#64748b', // Slate 500
      dark: '#1e293b', // Slate 800
      contrastText: '#ffffff',
    },
    success: {
      main: '#059669', // Emerald 600
      light: '#d1fae5', // Emerald 100
      dark: '#047857', // Emerald 700
      contrastText: '#ffffff',
    },
    warning: {
      main: '#d97706', // Amber 600
      light: '#fef3c7', // Amber 100
      dark: '#b45309', // Amber 700
      contrastText: '#ffffff',
    },
    error: {
      main: '#e11d48', // Rose 600
      light: '#ffe4e6', // Rose 100
      dark: '#be123c', // Rose 700
      contrastText: '#ffffff',
    },
    info: {
      main: '#0284c7', // Sky 600
      light: '#e0f2fe', // Sky 100
      dark: '#0369a1', // Sky 700
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc', // Slate 50
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // Slate 900
      secondary: '#64748b', // Slate 500
      disabled: '#94a3b8',
    },
    divider: 'rgba(226, 232, 240, 0.85)', // Slate 200 soft
  },
  typography: baseTypography,
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8fafc',
          color: '#0f172a',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
          padding: '8px 18px',
          boxShadow: 'none',
          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.18)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          boxShadow: '0 2px 4px rgba(79, 70, 229, 0.15)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(79, 70, 229, 0.28)',
          },
        },
        containedSecondary: {
          boxShadow: '0 2px 4px rgba(71, 85, 105, 0.15)',
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
        sizeSmall: {
          padding: '5px 12px',
          fontSize: '0.8125rem',
          borderRadius: 8,
        },
        sizeLarge: {
          padding: '11px 24px',
          fontSize: '0.9375rem',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 14,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
          border: '1px solid rgba(226, 232, 240, 0.85)',
        },
        elevation0: {
          border: 'none',
          boxShadow: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
          border: '1px solid rgba(226, 232, 240, 0.85)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(226, 232, 240, 0.85)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
          border: '1px solid rgba(226, 232, 240, 0.85)',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(203, 213, 225, 0.9)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#94a3b8',
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.12)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4f46e5',
              borderWidth: '1.5px',
            },
          },
        },
        input: {
          padding: '10.5px 14px',
          fontSize: '0.875rem',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(226, 232, 240, 0.85)',
          padding: '12px 16px',
          fontSize: '0.875rem',
        },
        head: {
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: '#64748b',
          backgroundColor: '#f8fafc',
          borderBottom: '1.5px solid rgba(226, 232, 240, 0.9)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        sizeSmall: {
          height: 24,
          fontSize: '0.72rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: '#0f172a',
          padding: '6px 12px',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(226, 232, 240, 0.85)',
        },
      },
    },
  },
};

export const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#818cf8', // Indigo 400
      light: '#a5b4fc', // Indigo 300
      dark: '#4f46e5', // Indigo 600
      contrastText: '#0f172a',
    },
    secondary: {
      main: '#94a3b8', // Slate 400
      light: '#cbd5e1', // Slate 300
      dark: '#64748b', // Slate 500
      contrastText: '#ffffff',
    },
    success: {
      main: '#34d399', // Emerald 400
      light: alpha('#34d399', 0.15),
      dark: '#059669',
      contrastText: '#064e3b',
    },
    warning: {
      main: '#fbbf24', // Amber 400
      light: alpha('#fbbf24', 0.15),
      dark: '#d97706',
      contrastText: '#78350f',
    },
    error: {
      main: '#fb7185', // Rose 400
      light: alpha('#fb7185', 0.15),
      dark: '#e11d48',
      contrastText: '#4c0519',
    },
    info: {
      main: '#38bdf8', // Sky 400
      light: alpha('#38bdf8', 0.15),
      dark: '#0284c7',
      contrastText: '#082f49',
    },
    background: {
      default: '#0b0f19', // Deep Obsidian
      paper: '#131b2e', // Slate 900
    },
    text: {
      primary: '#f8fafc', // Slate 50
      secondary: '#94a3b8', // Slate 400
      disabled: '#64748b',
    },
    divider: 'rgba(51, 65, 85, 0.6)', // Slate 700
  },
  typography: baseTypography,
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0b0f19',
          color: '#f8fafc',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
          padding: '8px 18px',
          boxShadow: 'none',
          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(129, 140, 248, 0.2)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          boxShadow: '0 2px 4px rgba(129, 140, 248, 0.15)',
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
        sizeSmall: {
          padding: '5px 12px',
          fontSize: '0.8125rem',
          borderRadius: 8,
        },
        sizeLarge: {
          padding: '11px 24px',
          fontSize: '0.9375rem',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 14,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          backgroundColor: '#131b2e',
        },
        elevation0: {
          border: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#131b2e',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#0e1526',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(71, 85, 105, 0.6)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#94a3b8',
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px rgba(129, 140, 248, 0.15)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#818cf8',
              borderWidth: '1.5px',
            },
          },
        },
        input: {
          padding: '10.5px 14px',
          fontSize: '0.875rem',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(51, 65, 85, 0.5)',
          padding: '12px 16px',
          fontSize: '0.875rem',
        },
        head: {
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: '#94a3b8',
          backgroundColor: '#0e1526',
          borderBottom: '1.5px solid rgba(51, 65, 85, 0.7)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        sizeSmall: {
          height: 24,
          fontSize: '0.72rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: '#131b2e',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: '#1e293b',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '6px 12px',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(51, 65, 85, 0.6)',
        },
      },
    },
  },
};

// Exporting default light theme for backwards compatibility before migration is complete
const theme = createTheme(lightThemeOptions);
export default theme;

