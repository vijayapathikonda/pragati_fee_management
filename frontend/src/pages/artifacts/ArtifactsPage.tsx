import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions, Button,
  Chip, TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Tab, Tabs, Paper, Divider, Autocomplete,
  CircularProgress, Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BadgeIcon from '@mui/icons-material/Badge';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import HandshakeIcon from '@mui/icons-material/Handshake';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import ArticleIcon from '@mui/icons-material/Article';

import { getArtifacts, getArtifact, downloadArtifact, ArtifactSummary, ArtifactDetail } from '../../services/artifact';
import { getStudents } from '../../services/student';

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'School': return <SchoolIcon fontSize="medium" />;
    case 'SyncAlt': return <SyncAltIcon fontSize="medium" />;
    case 'FactCheck': return <FactCheckIcon fontSize="medium" />;
    case 'Warning': return <WarningAmberIcon fontSize="medium" />;
    case 'Badge': return <BadgeIcon fontSize="medium" />;
    case 'AssignmentTurnedIn': return <AssignmentTurnedInIcon fontSize="medium" />;
    case 'WorkspacePremium': return <WorkspacePremiumIcon fontSize="medium" />;
    case 'Handshake': return <HandshakeIcon fontSize="medium" />;
    case 'FolderShared': return <FolderSharedIcon fontSize="medium" />;
    default: return <ArticleIcon fontSize="medium" />;
  }
};

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Preview & Print Dialog State
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Auto-fill Student State
  const [studentOptions, setStudentOptions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Field values for customization
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchArtifacts();
  }, []);

  const fetchArtifacts = async () => {
    setLoading(true);
    try {
      const data = await getArtifacts();
      setArtifacts(data);
    } catch (err) {
      console.error('Failed to load artifacts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenArtifact = async (summary: ArtifactSummary) => {
    setLoadingDetail(true);
    setDialogOpen(true);
    setSelectedStudent(null);
    try {
      const detail = await getArtifact(summary.id);
      setSelectedArtifact(detail);
      
      // Initialize default field values
      const initial: Record<string, string> = {};
      const today = new Date().toISOString().split('T')[0];
      
      detail.fields.forEach(f => {
        if (f.key === 'issue_date' || f.key === 'date') {
          initial[f.key] = today;
        } else if (f.default) {
          initial[f.key] = f.default;
        } else {
          initial[f.key] = '';
        }
      });
      setFormValues(initial);
    } catch (err) {
      console.error('Failed to load artifact detail', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Search students for auto-fill
  const handleSearchStudents = async (query: string) => {
    if (!query || query.length < 2) return;
    setLoadingStudents(true);
    try {
      const res = await getStudents({ search: query, size: 10 });
      setStudentOptions(res.data || []);
    } catch (err) {
      console.error('Student search failed', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Populate fields when student is picked
  const handleStudentSelect = (student: any | null) => {
    setSelectedStudent(student);
    if (!student) return;

    const updated = { ...formValues };
    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    const fatherName = student.father_name || '';
    const motherName = student.mother_name || '';
    const gradeName = student.grade?.name || (student.grade_id ? `Grade ${student.grade_id}` : '');
    const admNo = student.admission_number || '';
    const dob = student.date_of_birth || '';
    const caste = student.caste || student.category || 'General';
    const motherTongue = student.mother_tongue || 'Kannada';

    // Map into relevant template fields
    if ('student_name' in updated) updated.student_name = fullName;
    if ('parent_name' in updated) updated.parent_name = fatherName || motherName;
    if ('father_name' in updated) updated.father_name = fatherName;
    if ('mother_name' in updated) updated.mother_name = motherName;
    if ('admission_no' in updated) updated.admission_no = admNo;
    if ('grade' in updated) updated.grade = gradeName;
    if ('grade_to' in updated) updated.grade_to = gradeName;
    if ('current_class' in updated) updated.current_class = gradeName;
    if ('dob' in updated) updated.dob = dob;
    if ('caste' in updated) updated.caste = caste;
    if ('mother_tongue' in updated) updated.mother_tongue = motherTongue;
    if ('pen_no' in updated) updated.pen_no = student.pen_number || '-';
    if ('sts_no' in updated) updated.sts_no = student.sts_number || '-';

    setFormValues(updated);
  };

  const handleFieldChange = (key: string, val: string) => {
    setFormValues(prev => ({ ...prev, [key]: val }));
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredArtifacts = artifacts.filter(item => {
    const matchesQuery = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'student') return matchesQuery && item.type === 'student';
    if (activeTab === 'staff') return matchesQuery && item.type === 'staff';
    if (activeTab === 'admin') return matchesQuery && item.type === 'admin';
    return matchesQuery;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          Institutional Artifacts & Letters
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Official templates, study certificates, transfer certificates, undertakings, and staff letters for Pragati Vidyalaya.
        </Typography>
      </Box>

      {/* Filter Tabs & Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <Tabs
              value={activeTab}
              onChange={(_e, v) => setActiveTab(v)}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={`All Formats (${artifacts.length})`} value="all" />
              <Tab label="Student Certificates & Letters" value="student" />
              <Tab label="Staff & Teachers" value="staff" />
              <Tab label="Administrative & NOC" value="admin" />
            </Tabs>
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search letter formats..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Artifact Cards Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredArtifacts.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No document formats found matching your criteria.
        </Alert>
      ) : (
        <Grid container spacing={2.5}>
          {filteredArtifacts.map(item => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card
                elevation={1}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2.5,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: 'primary.50',
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getIconComponent(item.icon)}
                    </Box>
                    <Chip
                      size="small"
                      label={item.category}
                      color={item.type === 'student' ? 'primary' : item.type === 'staff' ? 'secondary' : 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                    />
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 0.75, lineHeight: 1.3 }}>
                    {item.title}
                  </Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 1.5, minHeight: 38 }}>
                    {item.description}
                  </Typography>

                  <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                    {item.filename} ({Math.round(item.file_size / 1024)} KB)
                  </Typography>
                </CardContent>

                <Divider />

                <CardActions sx={{ px: 2, py: 1.5, justifyContent: 'space-between' }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PrintIcon />}
                    onClick={() => handleOpenArtifact(item)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                  >
                    View & Print
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FileDownloadIcon />}
                    onClick={() => downloadArtifact(item.id, item.filename)}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Word (.docx)
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW & PRINT MODAL */}
      {/* ========================================================================= */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        scroll="paper"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            minHeight: '85vh',
          },
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {selectedArtifact && getIconComponent(selectedArtifact.icon)}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {selectedArtifact?.title || 'Document Preview'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Fill details on the left, preview real-time on the right, then click Print.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ textTransform: 'none', fontWeight: 700, px: 2.5 }}
            >
              Print Document
            </Button>
            {selectedArtifact && (
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={() => downloadArtifact(selectedArtifact.id, selectedArtifact.filename)}
                sx={{ textTransform: 'none' }}
              >
                Download .docx
              </Button>
            )}
            <IconButton onClick={() => setDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0, bgcolor: '#f4f6f8' }}>
          {loadingDetail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
              <CircularProgress />
            </Box>
          ) : selectedArtifact ? (
            <Grid container sx={{ minHeight: '75vh' }}>
              {/* LEFT COLUMN: Controls & Field inputs */}
              <Grid item xs={12} md={4} sx={{ p: 2.5, bgcolor: '#ffffff', borderRight: '1px solid #e0e0e0', overflowY: 'auto' }}>
                {/* Student Auto-Fill (if applicable) */}
                {selectedArtifact.type === 'student' && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #94a3b8' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'primary.main' }}>
                      <PersonSearchIcon fontSize="small" />
                      Auto-Fill from Student Roster
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                      Select a student to automatically populate their name, admission number, grade, father's name, etc.
                    </Typography>
                    <Autocomplete
                      size="small"
                      options={studentOptions}
                      loading={loadingStudents}
                      value={selectedStudent}
                      onChange={(_e, val) => handleStudentSelect(val)}
                      onInputChange={(_e, val) => handleSearchStudents(val)}
                      getOptionLabel={(opt) => `${opt.first_name || ''} ${opt.last_name || ''} (ADM: ${opt.admission_number || '-'})`}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Type student name..."
                          placeholder="e.g. Aadhya"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingStudents ? <CircularProgress size={18} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Box>
                )}

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
                  Document Fields & Variables
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
                  {selectedArtifact.fields.map(field => (
                    <TextField
                      key={field.key}
                      size="small"
                      label={field.label}
                      type={field.type === 'date' ? 'date' : 'text'}
                      multiline={field.type === 'textarea'}
                      rows={field.type === 'textarea' ? 3 : 1}
                      value={formValues[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  ))}
                </Box>
              </Grid>

              {/* RIGHT COLUMN: Authentic A4 Letterhead Sheet */}
              <Grid
                item
                xs={12}
                md={8}
                sx={{
                  p: { xs: 2, md: 4 },
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  overflowY: 'auto',
                }}
              >
                {/* ========================================================================= */}
                {/* THE PRINTABLE SHEET (Captured by window.print()) */}
                {/* ========================================================================= */}
                <Box
                  id="printable-document"
                  ref={printAreaRef}
                  sx={{
                    width: '100%',
                    maxWidth: '210mm',
                    minHeight: '297mm',
                    bgcolor: '#ffffff',
                    p: { xs: '15mm', md: '20mm' },
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    borderRadius: 1,
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    color: '#1a1a1a',
                    lineHeight: 1.6,
                    position: 'relative',
                    '@media print': {
                      boxShadow: 'none',
                      p: '15mm',
                      width: '100%',
                      maxWidth: '100%',
                      margin: 0,
                    },
                  }}
                >
                  {/* Official School Header with Logo */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      pb: 1.5,
                      mb: 2,
                      borderBottom: '2.5px solid #000',
                      gap: { xs: 1.5, sm: 2.5 },
                    }}
                  >
                    {/* Left: Pragati School Logo */}
                    <Box
                      component="img"
                      src="/logo.jpeg"
                      alt="Pragati Vidyalaya Logo"
                      sx={{
                        width: { xs: 65, sm: 80 },
                        height: 'auto',
                        maxHeight: 85,
                        objectFit: 'contain',
                        flexShrink: 0,
                      }}
                    />

                    {/* Center: Official School Details */}
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontFamily: '"Times New Roman", serif',
                          fontWeight: 900,
                          letterSpacing: '0.14em',
                          color: '#b91c1c', // Crimson school header
                          fontSize: { xs: '1.45rem', sm: '1.85rem' },
                          lineHeight: 1.15,
                          mb: 0.35,
                        }}
                      >
                        PRAGATI VIDYALAYA
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: { xs: 1.5, sm: 2.5 }, fontSize: '0.85rem', fontWeight: 700, color: '#222', mb: 0.35 }}>
                        <span>DISE No. 29130220703</span>
                        {selectedArtifact.id === 'transfer-certificate-request' && (
                          <span>CBSE AFFILIATION NO. 831401</span>
                        )}
                      </Box>

                      <Typography sx={{ fontSize: '0.88rem', color: '#333', lineHeight: 1.35 }}>
                        {selectedArtifact.id === 'study-certificate' || selectedArtifact.id === 'transfer-certificate-request'
                          ? 'Nagaramgere Road, Challakere - 577522, Chitradurga Dist.'
                          : 'Bengaluru Road, Challakere - 577522, Chitradurga Dist.'}
                      </Typography>
                      
                      <Typography sx={{ fontSize: '0.84rem', color: '#555', mt: 0.25 }}>
                        Mob: 7996622466 &nbsp;|&nbsp; Email: pragnalkidz@gmail.com
                      </Typography>
                    </Box>

                    {/* Right: Balanced Spacer for Precise Center Alignment */}
                    <Box
                      sx={{
                        width: { xs: 65, sm: 80 },
                        display: { xs: 'none', sm: 'block' },
                        flexShrink: 0,
                      }}
                    />
                  </Box>

                  {/* Document Title Banner */}
                  <Box sx={{ textAlign: 'center', my: 2.5 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: '"Times New Roman", serif',
                        fontWeight: 800,
                        textDecoration: 'underline',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontSize: '1.25rem',
                        color: '#000',
                      }}
                    >
                      {selectedArtifact.title}
                    </Typography>
                  </Box>

                  {/* Render Custom Document Content based on Artifact ID */}
                  {renderDocumentContent(selectedArtifact.id, formValues)}

                  {/* Official Signatures Footer */}
                  <Box sx={{ mt: 8, pt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.95rem' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.9rem' }}>
                        <strong>Date:</strong> {formValues.issue_date || formValues.date || '___/___/2026'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.9rem' }}>
                        <strong>Place:</strong> Challakere
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'center' }}>
                      <Box sx={{ height: 40 }} />
                      <Typography sx={{ fontWeight: 700, borderTop: '1px solid #000', pt: 0.5, minWidth: 180 }}>
                        {selectedArtifact.type === 'staff' && selectedArtifact.id === 'joining-letter'
                          ? 'Signature of the Faculty'
                          : selectedArtifact.id === 'student-undertaking'
                          ? 'Signatures of Parents'
                          : 'Signature of the Principal'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: '#555' }}>
                        Pragati Vidyalaya, Challakere
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}
          >
            Print Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global CSS for Print */}
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-document, #printable-document * {
              visibility: visible !important;
            }
            #printable-document {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: #ffffff !important;
            }
          }
        `}
      </style>
    </Box>
  );
}

// =========================================================================
// RENDERERS FOR THE 9 DOCUMENT TEMPLATES
// =========================================================================
function renderDocumentContent(artifactId: string, values: Record<string, string>) {
  const v = (key: string, fallback: string = '____________________') => {
    return values[key] ? (
      <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{values[key]}</span>
    ) : (
      <span>{fallback}</span>
    );
  };

  switch (artifactId) {
    case 'study-certificate':
      return (
        <Box sx={{ fontSize: '1.05rem', lineHeight: 2.1, textAlign: 'justify', my: 3 }}>
          <p>
            This is to certify that Kum / Chi {v('student_name', '________________________________________')}
            &nbsp;Son / Daughter of {v('parent_name', '________________________________________')},
            has studied from Class {v('grade_from', '__________')} to Class {v('grade_to', '__________')}
            &nbsp;in our institution for the Academic Years {v('academic_years', '____________________')}.
          </p>
          <p>
            She / He belongs to {v('caste', '____________________')} caste and mother tongue of the candidate is{' '}
            {v('mother_tongue', '____________________')} as per the Admission Register of the institution.
          </p>
          <Box sx={{ my: 2.5, pl: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div><strong>Date of Birth:</strong> {v('dob', '____ / ____ / ________')}</div>
            <div><strong>Admission No:</strong> {v('admission_no', '____________________')}</div>
            <div><strong>PEN NO:</strong> {v('pen_no', '____________________')}</div>
            <div><strong>STS NO:</strong> {v('sts_no', '____________________')}</div>
          </Box>
          <p style={{ marginTop: '1.5rem' }}>
            This certificate is issued according to the official records maintained at our School.
          </p>
        </Box>
      );

    case 'transfer-certificate-request':
      return (
        <Box sx={{ fontSize: '1.02rem', lineHeight: 2, my: 2 }}>
          <Box sx={{ mb: 2.5 }}>
            <p><strong>To,</strong></p>
            <p>The Head Master / Principal,</p>
            <p>{v('previous_school', '__________________________________________________')}</p>
          </Box>
          <p><strong>Respected Sir / Madam,</strong></p>
          <p style={{ textIndent: '2rem' }}>
            <strong>Subject: Issue of Transfer Certificate (T.C.)</strong>
          </p>
          <p style={{ marginTop: '1rem', textAlign: 'justify' }}>
            Kum / Chi {v('student_name', '______________________________')}, Son / Daughter of{' '}
            {v('parent_name', '______________________________')} who was studying in your esteemed institution
            in Class {v('previous_class', '__________')} during the academic year {v('previous_year', '__________')},
            is seeking admission in our school in Class {v('current_class', '__________')} for the current academic year{' '}
            {v('current_year', '2026-2027')}.
          </p>
          <p style={{ marginTop: '1rem', textAlign: 'justify' }}>
            Kindly issue the Transfer Certificate of the above-mentioned student along with his / her Student I.D. No.,
            School DISE Code No., UDISE+ PEN No., and APAAR Id No. at the earliest to facilitate enrollment.
          </p>
          <p style={{ marginTop: '2rem' }}>Thanking You,</p>
          <p>Yours faithfully,</p>
        </Box>
      );

    case 'student-undertaking':
      return (
        <Box sx={{ fontSize: '1.02rem', lineHeight: 2.1, textAlign: 'justify', my: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <span><strong>Ref. No:</strong> {v('ref_no', 'PV/UT/______')}</span>
            <span><strong>Date:</strong> {v('issue_date', '___/___/2026')}</span>
          </Box>
          <p>
            We hereby assure for the better academic co-operation of our ward{' '}
            {v('student_name', '________________________________________')}, studying in class{' '}
            {v('grade', '__________')} who has been newly admitted during the academic year{' '}
            {v('academic_year', '2026-2027')}, in your esteemed school Pragati Vidyalaya, Challakere.
          </p>
          <p style={{ marginTop: '1rem' }}>
            We promise to attend all Parent Teacher Meetings (PTM) to be held during this academic year to facilitate
            better performance and discipline of our ward. His/Her daily schedule of completing assigned homework and
            school tasks will be closely monitored from our end to ensure punctual completion. We promise to co-ordinate
            in all endeavors the school undertakes for our ward's academic and moral progress.
          </p>
          <Box sx={{ mt: 4, pt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <div><strong>Father's Name:</strong> {v('father_name', '______________________________')}</div>
            <div><strong>Mother's Name:</strong> {v('mother_name', '______________________________')}</div>
          </Box>
        </Box>
      );

    case 'suspension-letter':
      return (
        <Box sx={{ fontSize: '1.02rem', lineHeight: 2, my: 2 }}>
          <Box sx={{ mb: 2 }}>
            <p><strong>To,</strong></p>
            <p>Parents of: {v('student_name', '________________________________________')}</p>
            <p>Class: {v('grade', '__________')}</p>
          </Box>
          <p><strong>Dear Sir / Madam,</strong></p>
          <p style={{ textIndent: '2rem' }}>
            <strong>Subject: Disciplinary Suspension from School</strong>
          </p>
          <p style={{ marginTop: '1rem', textAlign: 'justify' }}>
            This is to inform you that your ward {v('student_name', '______________________________')} has been suspended from
            school for a duration of {v('days', '1 day')}, on account of {v('reason', 'misbehaviour both in classroom and School bus')}.
          </p>
          <p style={{ marginTop: '1rem' }}>
            The suspension takes effect on <strong>{v('suspension_date', '____/____/________')}</strong>.
          </p>
          <p style={{ marginTop: '1rem' }}>
            He / She is required to report back to the Principal's office on{' '}
            <strong>{v('report_date', '____/____/________')}</strong> at <strong>{v('report_time', '09:00 AM')}</strong> accompanied by parents.
          </p>
        </Box>
      );

    case 'hall-ticket':
      return (
        <Box sx={{ fontSize: '0.95rem', lineHeight: 1.8, my: 1.5 }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: '"Times New Roman", serif', fontWeight: 700 }}>
              {v('exam_name', 'Quarterly Examination')} – HALL TICKET ({v('academic_year', '2026-2027')})
            </Typography>
          </Box>

          <table style={{ width: '100%', marginBottom: '1.2rem', fontSize: '0.95rem', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '18%', fontWeight: 'bold', padding: '4px 0' }}>NAME:</td>
                <td style={{ width: '32%', padding: '4px 0' }}>{v('student_name', '____________________')}</td>
                <td style={{ width: '22%', fontWeight: 'bold', padding: '4px 0' }}>FATHER NAME:</td>
                <td style={{ width: '28%', padding: '4px 0' }}>{v('father_name', '____________________')}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', padding: '4px 0' }}>CLASS:</td>
                <td style={{ padding: '4px 0' }}>{v('grade', '__________')}</td>
                <td style={{ fontWeight: 'bold', padding: '4px 0' }}>ADMISSION NO:</td>
                <td style={{ padding: '4px 0' }}>{v('admission_no', '__________')}</td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1rem 0', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ border: '1px solid #333', padding: '6px 8px', width: '35%' }}>SUBJECT</th>
                <th style={{ border: '1px solid #333', padding: '6px 8px', width: '15%' }}>MAX MARK</th>
                <th style={{ border: '1px solid #333', padding: '6px 8px', width: '15%' }}>DATE</th>
                <th style={{ border: '1px solid #333', padding: '6px 8px', width: '15%' }}>TIME</th>
                <th style={{ border: '1px solid #333', padding: '6px 8px', width: '20%' }}>INVIGILATOR SIGN</th>
              </tr>
            </thead>
            <tbody>
              {['Kannada', 'English', 'Hindi', 'Mathematics', 'Science', 'Social Science'].map((sub, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', fontWeight: 600 }}>{sub}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', textAlign: 'center' }}>{v(`mark_${idx}`, '100')}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', textAlign: 'center' }}>{v(`date_${idx}`, '____/____')}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', textAlign: 'center' }}>{v(`time_${idx}`, '10:00 AM')}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px' }}></td>
                </tr>
              ))}
            </tbody>
          </table>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, px: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <div style={{ width: '160px', borderBottom: '1px solid #333', marginBottom: '6px' }}></div>
              <strong>CLASS TEACHER</strong>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <div style={{ width: '160px', borderBottom: '1px solid #333', marginBottom: '6px' }}></div>
              <strong>PRINCIPAL</strong>
            </Box>
          </Box>
        </Box>
      );

    case 'appointment-letter':
      return (
        <Box sx={{ fontSize: '0.98rem', lineHeight: 1.9, textAlign: 'justify', my: 2 }}>
          <Box sx={{ mb: 2 }}>
            <p><strong>To,</strong></p>
            <p>Mr. / Ms. {v('teacher_name', '________________________________________')}</p>
            <p>{v('address', 'Challakere')}</p>
          </Box>
          <p><strong>Dear Sir / Madam,</strong></p>
          <p><strong>Subject: Appointment for the Post of {v('designation', 'Teacher')}</strong></p>
          <p style={{ marginTop: '0.75rem' }}>
            We are pleased to offer you the position of {v('designation', 'Teacher')} for the subject{' '}
            {v('subject', '____________________')} at Pragati Vidyalaya, Challakere. You are requested to join duty on or before{' '}
            <strong>{v('joining_date', '____/____/________')}</strong>.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Your monthly consolidated salary and terms of employment will be as per the institution's service rules agreed upon during the interview. You are required to submit your original academic certificates and ID proofs at the time of joining.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            We warmly welcome you to our teaching fraternity and look forward to your valuable contribution towards the holistic development of our students.
          </p>
        </Box>
      );

    case 'joining-letter':
      return (
        <Box sx={{ fontSize: '1.02rem', lineHeight: 2, my: 2 }}>
          <Box sx={{ mb: 2 }}>
            <p><strong>To,</strong></p>
            <p>The Chairman / Director,</p>
            <p>Pragati Vidyalaya, Challakere</p>
          </Box>
          <p><strong>Respected Sir / Madam,</strong></p>
          <p><strong>Subject: Joining the Organization</strong></p>
          <p style={{ marginTop: '1rem', textAlign: 'justify' }}>
            I am immensely pleased to inform you that I accept the offer of appointment and acknowledge the terms of service. I am reporting to join my duties as {v('position', 'TGT Teacher')} for the subject of {v('subject', 'English')} in your esteemed organization on <strong>{v('joining_date', '____/____/________')}</strong>.
          </p>
          <p style={{ marginTop: '1rem', textAlign: 'justify' }}>
            I sincerely thank you for placing your trust in me and offering this opportunity. I assure you that I will discharge my duties with utmost sincerity, dedication, and academic integrity. All required original certificates and credentials are being submitted herewith.
          </p>
        </Box>
      );

    case 'experience-certificate':
      return (
        <Box sx={{ fontSize: '1.05rem', lineHeight: 2.2, textAlign: 'justify', my: 4 }}>
          <p style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '2rem' }}>
            TO WHOMSOEVER IT MAY CONCERN
          </p>
          <p>
            This is to certify that Mrs. / Ms. / Mr. {v('teacher_name', '________________________________________')},
            Wife / Son / Daughter of {v('relation_name', '________________________________________')},
            has worked in our Institution from <strong>{v('from_date', '____/____/________')}</strong> to{' '}
            <strong>{v('to_date', '____/____/________')}</strong> as a {v('designation', 'TGT Teacher')},
            teaching classes {v('classes_taught', '1 to 10')}.
          </p>
          <p style={{ marginTop: '1.5rem' }}>
            During her / his tenure with us, we found her / him to be adaptive, sincere, hardworking, and dedicated towards all academic and co-curricular duties assigned to her / him. She / He possesses good moral character and maintained pleasant relations with staff and students.
          </p>
          <p style={{ marginTop: '1.5rem' }}>
            We wish her / him all success in all future endeavors.
          </p>
        </Box>
      );

    case 'teachers-undertaking':
      return (
        <Box sx={{ fontSize: '0.98rem', lineHeight: 1.9, textAlign: 'justify', my: 2 }}>
          <Box sx={{ mb: 2 }}>
            <p><strong>To,</strong></p>
            <p>The Principal / Management,</p>
            <p>Pragati Vidyalaya, Near Bhutappa Temple, Nagaramgere Road, Challakere</p>
          </Box>
          <p><strong>Respected Sir / Madam,</strong></p>
          <p><strong>Subject: Undertaking to continue service till the completion of Academic Year {v('academic_year', '2026-27')}</strong></p>
          <p style={{ marginTop: '1rem', textAlign: 'justify' }}>
            I, {v('teacher_name', '________________________________________')}, working as a {v('cadre', 'TGT')}{' '}
            {v('subject', '____________________')} Teacher at Pragati Vidyalaya, hereby undertake and confirm that I will continue my services till {v('service_till_date', 'the completion of the academic year')} and will work in the best interest of the institution to successfully complete the current academic year {v('academic_year', '2026-27')} and next academic year {v('next_academic_year', '2027-28')}.
          </p>
          <p style={{ marginTop: '0.75rem', textAlign: 'justify' }}>
            I understand the crucial importance of academic continuity for the students and assure that I will fulfill all my instructional duties, evaluations, lesson planning, and institutional responsibilities without interruption. In case of any early discontinuation without prior notice and mutual consent, I agree to abide by the institution's policy regarding compensation.
          </p>
        </Box>
      );

    case 'original-marks-card-noc':
      return (
        <Box sx={{ fontSize: '0.98rem', lineHeight: 1.9, my: 2 }}>
          <Box sx={{ mb: 2 }}>
            <p><strong>To,</strong></p>
            <p>The Principal, Pragati Vidyalaya, Challakere - 577522</p>
          </Box>
          <p><strong>Subject: Submission of Original Documents & NOC Verification</strong></p>
          <p style={{ marginTop: '0.75rem' }}>
            I, {v('staff_name', '________________________________________')}, working as {v('designation', 'Teacher')}, confirm the submission/clearance of my original documents with the school office:
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1.2rem 0', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ border: '1px solid #333', padding: '6px 12px', width: '10%' }}>Sl No.</th>
                <th style={{ border: '1px solid #333', padding: '6px 12px', width: '60%' }}>Particulars of Original Documents</th>
                <th style={{ border: '1px solid #333', padding: '6px 12px', width: '30%' }}>Verification / Signature</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #333', padding: '6px 12px', textAlign: 'center' }}>1</td>
                <td style={{ border: '1px solid #333', padding: '6px 12px' }}>{v('doc_1', 'SSLC / 10th Marks Card')}</td>
                <td style={{ border: '1px solid #333', padding: '6px 12px' }}>Verified & Received</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #333', padding: '6px 12px', textAlign: 'center' }}>2</td>
                <td style={{ border: '1px solid #333', padding: '6px 12px' }}>{v('doc_2', 'PUC / 12th Marks Card')}</td>
                <td style={{ border: '1px solid #333', padding: '6px 12px' }}>Verified & Received</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #333', padding: '6px 12px', textAlign: 'center' }}>3</td>
                <td style={{ border: '1px solid #333', padding: '6px 12px' }}>{v('doc_3', 'Degree / Graduation Certificate')}</td>
                <td style={{ border: '1px solid #333', padding: '6px 12px' }}>Verified & Received</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #333', padding: '6px 12px', textAlign: 'center' }}>4</td>
                <td style={{ border: '1px solid #333', padding: '6px 12px' }}>{v('doc_4', 'B.Ed / D.Ed Certificate')}</td>
                <td style={{ border: '1px solid #333', padding: '6px 12px' }}>Verified & Received</td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: '1.5rem', fontWeight: 'bold' }}>Department Clearance & NOC Signatures:</p>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1.5, fontSize: '0.85rem' }}>
            <div style={{ border: '1px solid #999', padding: '8px', textAlign: 'center' }}>1. Library Clearance</div>
            <div style={{ border: '1px solid #999', padding: '8px', textAlign: 'center' }}>2. Science / Math Lab</div>
            <div style={{ border: '1px solid #999', padding: '8px', textAlign: 'center' }}>3. Academic Coordinator</div>
            <div style={{ border: '1px solid #999', padding: '8px', textAlign: 'center' }}>4. Accounts / Fee Office</div>
            <div style={{ border: '1px solid #999', padding: '8px', textAlign: 'center' }}>5. Principal</div>
            <div style={{ border: '1px solid #999', padding: '8px', textAlign: 'center' }}>6. Management</div>
          </Box>
        </Box>
      );

    default:
      return (
        <Box sx={{ fontSize: '1rem', lineHeight: 1.8, my: 2 }}>
          <p>Please select a document format to preview.</p>
        </Box>
      );
  }
}
