import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SecurityIcon from '@mui/icons-material/Security';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SyncIcon from '@mui/icons-material/Sync';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import Switch from '@mui/material/Switch';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

export const HomePage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [annualBilling, setAnnualBilling] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || user) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Hero Section com fundo azul */}
      <Box
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          pt: { xs: 8, md: 12 },
          pb: { xs: 8, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={4} sx={{ textAlign: { xs: 'left', md: 'center' } }}>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' },
                lineHeight: 1.2,
                maxWidth: { xs: '100%', md: '900px' },
                mx: { xs: 0, md: 'auto' },
              }}
            >
              Bem-vindo ao pratikapp
            </Typography>
            <Typography
              variant="h6"
              component="p"
              sx={{
                fontSize: { xs: '1rem', md: '1.25rem' },
                lineHeight: 1.6,
                maxWidth: { xs: '100%', md: '700px' },
                mx: { xs: 0, md: 'auto' },
                opacity: 0.9,
              }}
            >
              Gerencie o agendamento e a publicação de vídeos em múltiplas plataformas sociais de
              maneira simples e prática.
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                justifyContent: { xs: 'flex-start', md: 'center' },
                mt: 2,
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/signup')}
                sx={{
                  bgcolor: '#ffffff',
                  color: theme.palette.primary.main,
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                  },
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
                endIcon={<ArrowForwardIcon />}
              >
                Começar agora
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: '#ffffff',
                  color: '#ffffff',
                  '&:hover': {
                    borderColor: '#ffffff',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
              >
                Fazer login
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={{ xs: 8, md: 12 }}>
          {/* Features Section 1 */}
          <Box>
            <Stack spacing={4} sx={{ textAlign: 'center', mb: 6 }}>
              <Chip
                label="FEATURES"
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  letterSpacing: '2px',
                  height: 32,
                  width: 'fit-content',
                  mx: 'auto',
                }}
              />
              <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                Nossa solução para seu negócio
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  maxWidth: '800px',
                  mx: 'auto',
                  lineHeight: 1.75,
                }}
              >
                Somos uma plataforma de agendamento e publicação de vídeos que permite criar
                agendamentos visualmente e publicar automaticamente em múltiplas plataformas em
                minutos.
              </Typography>
            </Stack>

            <Grid container spacing={{ xs: 3, md: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Stack spacing={3} alignItems="center" textAlign="center">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          backgroundColor: theme.palette.primary.main,
                        }}
                      >
                        <VideoLibraryIcon sx={{ fontSize: 40, color: '#ffffff' }} />
                      </Box>
                      <Stack spacing={1}>
                        <Typography variant="h5" component="h3" fontWeight={700}>
                          Organize seus vídeos
                        </Typography>
                        <Typography variant="body2" color="text.secondary" lineHeight={1.75}>
                          Conecte seu Google Drive e gerencie todos os seus vídeos em um só lugar.
                        </Typography>
                      </Stack>
                      <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          color: theme.palette.primary.main,
                          fontWeight: 700,
                          fontSize: '1.125rem',
                        }}
                      >
                        Saiba mais
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Stack spacing={3} alignItems="center" textAlign="center">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          backgroundColor: theme.palette.primary.main,
                        }}
                      >
                        <SecurityIcon sx={{ fontSize: 40, color: '#ffffff' }} />
                      </Box>
                      <Stack spacing={1}>
                        <Typography variant="h5" component="h3" fontWeight={700}>
                          Colabore com segurança
                        </Typography>
                        <Typography variant="body2" color="text.secondary" lineHeight={1.75}>
                          Compartilhe e publique seus vídeos com sua equipe de forma segura.
                        </Typography>
                      </Stack>
                      <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          color: theme.palette.primary.main,
                          fontWeight: 700,
                          fontSize: '1.125rem',
                        }}
                      >
                        Saiba mais
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Stack spacing={3} alignItems="center" textAlign="center">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          backgroundColor: theme.palette.primary.main,
                        }}
                      >
                        <AssessmentIcon sx={{ fontSize: 40, color: '#ffffff' }} />
                      </Box>
                      <Stack spacing={1}>
                        <Typography variant="h5" component="h3" fontWeight={700}>
                          Analytics integrados
                        </Typography>
                        <Typography variant="body2" color="text.secondary" lineHeight={1.75}>
                          Obtenha uma ferramenta poderosa de analytics em sua própria marca.
                        </Typography>
                      </Stack>
                      <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          color: theme.palette.primary.main,
                          fontWeight: 700,
                          fontSize: '1.125rem',
                        }}
                      >
                        Saiba mais
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Stack spacing={3} alignItems="center" textAlign="center">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          backgroundColor: theme.palette.primary.main,
                        }}
                      >
                        <AutoAwesomeIcon sx={{ fontSize: 40, color: '#ffffff' }} />
                      </Box>
                      <Stack spacing={1}>
                        <Typography variant="h5" component="h3" fontWeight={700}>
                          Fácil e intuitivo
                        </Typography>
                        <Typography variant="body2" color="text.secondary" lineHeight={1.75}>
                          Converse facilmente com seus dados usando linguagem do dia a dia.
                        </Typography>
                      </Stack>
                      <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          color: theme.palette.primary.main,
                          fontWeight: 700,
                          fontSize: '1.125rem',
                        }}
                      >
                        Saiba mais
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* Analytics Section */}
          <Box>
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack spacing={3}>
                  <Chip
                    label="ANALYTICS"
                    sx={{
                      bgcolor: '#36b37e',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      letterSpacing: '2px',
                      height: 32,
                      width: 'fit-content',
                    }}
                  />
                  <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                    Analise seus dados com nossas ferramentas
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                    Plataforma de analytics de autoatendimento que permite criar visualizações de
                    dados visualmente atraentes e dashboards perspicazes em minutos.
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={2} direction="row" alignItems="flex-start">
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                backgroundColor: theme.palette.primary.main,
                              }}
                            >
                              <DashboardIcon sx={{ fontSize: 32, color: '#ffffff' }} />
                            </Box>
                            <Stack spacing={0.5}>
                              <Typography variant="h6" component="h4" fontWeight={700}>
                                Dashboard poderoso
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Combine múltiplos relatórios em um único dashboard.
                              </Typography>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={2} direction="row" alignItems="flex-start">
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                backgroundColor: theme.palette.primary.main,
                              }}
                            >
                              <SyncIcon sx={{ fontSize: 32, color: '#ffffff' }} />
                            </Box>
                            <Stack spacing={0.5}>
                              <Typography variant="h6" component="h4" fontWeight={700}>
                                Sempre sincronizado
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Não se preocupe com os dados, sempre sincronizados.
                              </Typography>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/signup')}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      mt: 2,
                      width: { xs: '100%', sm: 'auto' },
                    }}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Experimente grátis
                  </Button>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Box
                  sx={{
                    height: { xs: 300, md: 500 },
                    bgcolor: theme.palette.grey[100],
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    [Imagem/Dashboard Preview]
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Features Section 2 */}
          <Box>
            <Stack spacing={4} sx={{ textAlign: 'center', mb: 6 }}>
              <Chip
                label="FEATURES"
                sx={{
                  bgcolor: '#36b37e',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  letterSpacing: '2px',
                  height: 32,
                  width: 'fit-content',
                  mx: 'auto',
                }}
              />
              <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                Explore nossos recursos incríveis
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  maxWidth: '800px',
                  mx: 'auto',
                  lineHeight: 1.75,
                }}
              >
                Uma biblioteca JavaScript incrível e poderosa para criar interfaces de usuário.
                Independente de qualquer biblioteca ou framework de terceiros.
              </Typography>
            </Stack>

            <Grid container spacing={{ xs: 3, md: 4 }}>
              {[
                { icon: <VideoLibraryIcon />, title: 'Personalização fácil', desc: 'Não importa que tipo de conteúdo você tenha para compartilhar, você pode aumentar seus resultados.' },
                { icon: <SecurityIcon />, title: 'Seguro e rápido', desc: 'Não importa que tipo de conteúdo você tenha para compartilhar, você pode aumentar seus resultados.' },
                { icon: <DashboardIcon />, title: 'Dashboard poderoso', desc: 'Não importa que tipo de conteúdo você tenha para compartilhar, você pode aumentar seus resultados.' },
                { icon: <CloudUploadIcon />, title: 'Upload na nuvem', desc: 'Não importa que tipo de conteúdo você tenha para compartilhar, você pode aumentar seus resultados.' },
                { icon: <SyncIcon />, title: 'Tecnologia comprovada', desc: 'Não importa que tipo de conteúdo você tenha para compartilhar, você pode aumentar seus resultados.' },
                { icon: <CheckCircleIcon />, title: '98.99% de satisfação', desc: 'Não importa que tipo de conteúdo você tenha para compartilhar, você pode aumentar seus resultados.' },
              ].map((feature, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            border: `2px solid ${theme.palette.primary.main}`,
                            color: theme.palette.primary.main,
                          }}
                        >
                          {feature.icon}
                        </Box>
                        <Stack spacing={1}>
                          <Typography variant="h6" component="h3" fontWeight={600}>
                            {feature.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" lineHeight={1.75}>
                            {feature.desc}
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Integration Section */}
          <Box sx={{ textAlign: 'center' }}>
            <Stack spacing={4}>
              <Chip
                label="INTEGRATION"
                sx={{
                  bgcolor: '#36b37e',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  letterSpacing: '2px',
                  height: 32,
                  width: 'fit-content',
                  mx: 'auto',
                }}
              />
              <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                Integrações perfeitas com outras ferramentas
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  maxWidth: '700px',
                  mx: 'auto',
                  lineHeight: 1.75,
                }}
              >
                O pratikapp funciona perfeitamente com ferramentas em suas outras plataformas
                existentes.
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  justifyContent: 'center',
                  alignItems: 'center',
                  py: 4,
                }}
              >
                {['Shopify', 'Digital Ocean', 'Google Analytics', 'Amazon'].map((name, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 120,
                      height: 60,
                      bgcolor: theme.palette.grey[100],
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Stack>
          </Box>

          {/* Customer Section */}
          <Box>
            <Stack spacing={4} sx={{ textAlign: 'center', mb: 6 }}>
              <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
                Confiado pelas maiores empresas do mundo
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 3,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {['Slack', 'Netflix', 'Fitbit', 'Google', 'Airbnb', 'Uber'].map((name, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 120,
                      height: 40,
                      bgcolor: theme.palette.grey[100],
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      {name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Stack>

            {/* Testimonials */}
            <Grid container spacing={3}>
              {[
                {
                  company: 'Airbnb',
                  text: 'Recebi um excelente atendimento dos especialistas que me ajudaram. Recomendo para qualquer pessoa que queira um dashboard de alta qualidade.',
                  author: 'Bryan Arnoldy',
                },
                {
                  company: 'Amazon',
                  text: 'Minha experiência com esta plataforma até agora tem sido excelente. Tudo é fácil, desde a criação de visualizações, agendamento, colaboração e muito mais.',
                  author: 'Joshua William',
                },
              ].map((testimonial, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={index}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                      <Stack spacing={3}>
                        <Typography variant="h6" color="primary" fontWeight={700}>
                          {testimonial.company}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" lineHeight={1.75}>
                          {testimonial.text}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle2" fontWeight={600}>
                            {testimonial.author}
                          </Typography>
                          <Chip
                            label="Cliente verificado"
                            size="small"
                            sx={{
                              bgcolor: 'transparent',
                              color: 'text.secondary',
                              fontStyle: 'italic',
                              fontSize: '0.75rem',
                            }}
                          />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Collaborate Section */}
          <Box>
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack spacing={4}>
                  <Chip
                    label="COLLABORATE"
                    sx={{
                      bgcolor: '#36b37e',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      letterSpacing: '2px',
                      height: 32,
                      width: 'fit-content',
                    }}
                  />
                  <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                    Colabore com sua equipe a qualquer hora, em qualquer lugar.
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                    Veja quais aplicativos sua equipe está usando e participe com um clique.
                    Cursor compartilhado é melhor que compartilhamento de tela.
                  </Typography>
                  <Grid container spacing={2}>
                    {[
                      { icon: <PersonIcon />, text: 'Organize seus dados' },
                      { icon: <GroupIcon />, text: 'Trabalhe com qualquer equipe' },
                      { icon: <AnalyticsIcon />, text: 'Analytics de negócios' },
                      { icon: <SyncIcon />, text: 'Sempre sincronizado' },
                      { icon: <AssessmentIcon />, text: 'Analytics integrados' },
                    ].map((item, index) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={index}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Box
                            sx={{
                              color: theme.palette.primary.main,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {item.icon}
                          </Box>
                          <Typography variant="body1" fontWeight={400}>
                            {item.text}
                          </Typography>
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Box
                  sx={{
                    height: { xs: 300, md: 500 },
                    bgcolor: theme.palette.grey[100],
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    [Imagem de Colaboração]
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Pricing Section */}
          <Box
            sx={{
              bgcolor: theme.palette.grey[50],
              borderRadius: 4,
              py: { xs: 6, md: 10 },
              px: { xs: 3, md: 4 },
            }}
          >
            <Stack spacing={4} sx={{ textAlign: 'center', mb: 6 }}>
              <Chip
                label="OUR PRICING"
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  letterSpacing: '2px',
                  height: 32,
                  width: 'fit-content',
                  mx: 'auto',
                }}
              />
              <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
                Escolha o plano certo para seu negócio
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  maxWidth: '800px',
                  mx: 'auto',
                  lineHeight: 1.75,
                }}
              >
                Comece com o plano Grátis para experimentar nossa plataforma por tempo ilimitado.
                Comece agora
                <ArrowForwardIcon
                  sx={{ fontSize: '1rem', verticalAlign: 'middle', ml: 0.5 }}
                />
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mx: 'auto', width: 'fit-content' }}>
                <Typography variant="body2" color={!annualBilling ? 'primary' : 'text.secondary'}>
                  Cobrança Mensal
                </Typography>
                <Switch checked={annualBilling} onChange={(e) => setAnnualBilling(e.target.checked)} />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color={annualBilling ? 'primary' : 'text.secondary'}>
                    Cobrança Anual
                  </Typography>
                  {annualBilling && (
                    <Chip
                      label="Economize 15%"
                      size="small"
                      sx={{
                        bgcolor: '#36b37e',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        height: 20,
                      }}
                    />
                  )}
                </Stack>
              </Stack>
            </Stack>

            <Grid container spacing={{ xs: 3, md: 4 }} justifyContent="center">
              {[
                {
                  name: 'Standard',
                  price: '$39',
                  period: '/mês',
                  description: 'O básico para empresas que estão apenas começando.',
                  features: [
                    'Uso de projeto único',
                    'Dashboard básico',
                    'Todos os componentes incluídos',
                  ],
                  borderColor: '#3f598a',
                },
                {
                  name: 'Essentials',
                  price: '$99',
                  period: '/mês',
                  description: 'Melhor para empresas em crescimento que querem mais clientes.',
                  features: [
                    'Uso de projetos ilimitados',
                    'Dashboard avançado',
                    'Todos os componentes incluídos',
                    'Insights avançados',
                  ],
                  borderColor: '#36b37e',
                  highlighted: true,
                },
                {
                  name: 'Premium',
                  price: '$339',
                  period: '/mês',
                  description: 'Recursos avançados para profissionais que precisam de mais personalização.',
                  features: [
                    'Uso de projetos ilimitados',
                    'Dashboard avançado',
                    'Componentes multivariados',
                    'Suporte telefônico',
                  ],
                  borderColor: theme.palette.primary.main,
                },
              ].map((plan, index) => (
                <Grid size={{ xs: 12, md: 4 }} key={index}>
                  <Card
                    sx={{
                      height: '100%',
                      position: 'relative',
                      borderTop: `3px solid ${plan.borderColor}`,
                    }}
                  >
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                      <Stack spacing={3}>
                        <Stack spacing={1}>
                          <Typography variant="h4" component="h3" fontWeight={700}>
                            {plan.price}
                            <Typography
                              component="span"
                              variant="body1"
                              color="text.secondary"
                              sx={{ ml: 0.5 }}
                            >
                              {plan.period}
                            </Typography>
                          </Typography>
                          <Typography variant="h5" component="h4" fontWeight={700}>
                            {plan.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" lineHeight={1.75}>
                            {plan.description}
                          </Typography>
                        </Stack>
                        <Stack spacing={2}>
                          {plan.features.map((feature, idx) => (
                            <Stack key={idx} direction="row" spacing={1} alignItems="center">
                              <CheckCircleIcon
                                sx={{ color: theme.palette.primary.main, fontSize: 24 }}
                              />
                              <Typography variant="body2">{feature}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                        <Button
                          variant={plan.highlighted ? 'contained' : 'outlined'}
                          color="primary"
                          fullWidth
                          onClick={() => navigate('/signup')}
                          sx={{
                            mt: 2,
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 700,
                          }}
                          endIcon={<ArrowForwardIcon />}
                        >
                          Começar
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* CTA Section Final */}
          <Box>
            <Card
              sx={{
                borderRadius: 4,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}10 100%)`,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: { xs: 4, md: 6 } }}>
                <Stack
                  spacing={3}
                  sx={{
                    textAlign: { xs: 'left', md: 'center' },
                    alignItems: { xs: 'flex-start', md: 'center' },
                  }}
                >
                  <Stack spacing={1} sx={{ width: '100%' }}>
                    <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
                      Comece agora
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: '1rem', md: '1.125rem' },
                        maxWidth: { xs: '100%', md: '600px' },
                        mx: { xs: 0, md: 'auto' },
                      }}
                    >
                      Crie sua conta gratuitamente e comece a automatizar suas publicações hoje
                      mesmo.
                    </Typography>
                  </Stack>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{
                      width: { xs: '100%', sm: 'auto' },
                      alignItems: { xs: 'stretch', sm: 'center' },
                    }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={() => navigate('/signup')}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 700,
                      }}
                    >
                      Criar conta
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="large"
                      onClick={() => navigate('/login')}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 700,
                      }}
                    >
                      Fazer login
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`,
          mt: { xs: 8, md: 12 },
          py: { xs: 6, md: 8 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 6 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={3}>
                <Typography variant="h6" component="div" fontWeight={700}>
                  pratikapp
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Construa uma plataforma moderna e criativa para gerenciar seus vídeos.
                </Typography>
                <Stack direction="row" spacing={1}>
                  {[
                    { icon: <FacebookIcon />, label: 'Facebook' },
                    { icon: <TwitterIcon />, label: 'Twitter' },
                    { icon: <InstagramIcon />, label: 'Instagram' },
                    { icon: <LinkedInIcon />, label: 'LinkedIn' },
                  ].map((social, index) => (
                    <Box
                      key={index}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: theme.palette.grey[200],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: theme.palette.primary.main,
                          color: '#ffffff',
                        },
                        transition: 'all 0.2s',
                      }}
                    >
                      {social.icon}
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Stack spacing={2}>
                <Typography variant="h6" component="h3" fontWeight={700}>
                  Produto
                </Typography>
                {['Landingpage', 'Features', 'Documentation', 'Referral Program', 'Pricing'].map(
                  (link, index) => (
                    <Typography
                      key={index}
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { color: theme.palette.primary.main },
                      }}
                    >
                      {link}
                    </Typography>
                  ),
                )}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Stack spacing={2}>
                <Typography variant="h6" component="h3" fontWeight={700}>
                  Serviços
                </Typography>
                {['Documentation', 'Design', 'Themes', 'Illustrations', 'UI Kit'].map(
                  (link, index) => (
                    <Typography
                      key={index}
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { color: theme.palette.primary.main },
                      }}
                    >
                      {link}
                    </Typography>
                  ),
                )}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Stack spacing={2}>
                <Typography variant="h6" component="h3" fontWeight={700}>
                  Empresa
                </Typography>
                {['About', 'Terms', 'Privacy Policy', 'Careers'].map((link, index) => (
                  <Typography
                    key={index}
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { color: theme.palette.primary.main },
                    }}
                  >
                    {link}
                  </Typography>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6" component="h3" fontWeight={700}>
                  Mais
                </Typography>
                {['Documentation', 'License', 'Changelog'].map((link, index) => (
                  <Typography
                    key={index}
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { color: theme.palette.primary.main },
                    }}
                  >
                    {link}
                  </Typography>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

