import AddIcon from '@mui/icons-material/Add';
import TodayIcon from '@mui/icons-material/Today';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';

import { EmptyState, useNotification } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { platformsRepository, videosRepository } from '@/services/database';
import type { Video } from '@/services/database/types';
import { mapSupabaseError } from '@/utils/errorMessages';
import { getMediaTypeInfo } from '@/utils/mediaTypes';
import { getPlatformInfo } from '@/utils/platforms';

// Configurar locale pt-BR com formato de 24 horas
moment.locale('pt-br', {
  longDateFormat: {
    LT: 'HH:mm', // 24 horas
    LTS: 'HH:mm:ss', // 24 horas com segundos
    L: 'DD/MM/YYYY',
    LL: 'D [de] MMMM [de] YYYY',
    LLL: 'D [de] MMMM [de] YYYY [às] HH:mm',
    LLLL: 'dddd, D [de] MMMM [de] YYYY [às] HH:mm',
  },
  week: {
    dow: 0, // Domingo é o primeiro dia da semana (0 = domingo, 1 = segunda)
  },
});

const localizer = momentLocalizer(moment);

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  video: Video;
}

export const SchedulesCalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');

  useEffect(() => {
    if (user?.id) {
      loadVideos();
    }
  }, [user?.id]);

  const loadVideos = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const userVideos = await videosRepository.listByUser(user.id);
      setVideos(userVideos);
    } catch (err) {
      showError(mapSupabaseError(err instanceof Error ? err : undefined));
    } finally {
      setLoading(false);
    }
  }, [user?.id, showError]);

  // Converter vídeos em eventos do calendário
  const events = useMemo<CalendarEvent[]>(() => {
    return videos
      .filter((video) => video.scheduledDate) // Apenas vídeos com data agendada
      .map((video) => {
        const start = new Date(video.scheduledDate!);
        // Evento dura 1 hora por padrão (pode ser ajustado depois)
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        // Construir título com informações do vídeo
        let title = video.title;
        
        // Adicionar tipo de mídia se disponível
        if (video.mediaType) {
          try {
                      const mediaInfo = getMediaTypeInfo(video.mediaType);
            title = `${mediaInfo.label} - ${title}`;
          } catch {
            // Ignorar erro se tipo de mídia não for encontrado
          }
        }

        // Adicionar plataformas selecionadas
        if (video.selectedPlatformIds && video.selectedPlatformIds.length > 0) {
          // Aqui precisaríamos buscar as plataformas para mostrar os nomes
          // Por enquanto, apenas mostramos o número
          title = `${title} (${video.selectedPlatformIds.length} plataforma${video.selectedPlatformIds.length > 1 ? 's' : ''})`;
        }

        return {
          id: video.id,
          title,
          start,
          end,
          video,
        } as CalendarEvent;
      });
  }, [videos]);

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    // Criar novo agendamento com data/hora pré-preenchida
    const formattedDate = moment(start).format('DD/MM/YYYY');
    const formattedTime = moment(start).format('HH:mm');
    navigate(`/schedules/new?date=${formattedDate}&time=${formattedTime}`);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    // Navegar para detalhes do vídeo ou edição
    navigate(`/videos/${event.video.id}`);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPrev = () => {
    let newDate: Date;
    if (view === 'month') {
      newDate = moment(currentDate).subtract(1, 'month').toDate();
    } else if (view === 'week') {
      newDate = moment(currentDate).subtract(1, 'week').toDate();
    } else {
      newDate = moment(currentDate).subtract(1, 'day').toDate();
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    let newDate: Date;
    if (view === 'month') {
      newDate = moment(currentDate).add(1, 'month').toDate();
    } else if (view === 'week') {
      newDate = moment(currentDate).add(1, 'week').toDate();
    } else {
      newDate = moment(currentDate).add(1, 'day').toDate();
    }
    setCurrentDate(newDate);
  };

  // Customizar renderização de eventos
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#1565d8'; // Azul primário padrão
    
    // Mudar cor baseado no status
    switch (event.video.status) {
      case 'scheduled':
        backgroundColor = '#1565d8'; // Azul
        break;
      case 'pending':
        backgroundColor = '#ff9800'; // Laranja
        break;
      case 'processing':
        backgroundColor = '#9c27b0'; // Roxo
        break;
      case 'posted':
        backgroundColor = '#4caf50'; // Verde
        break;
      case 'failed':
        backgroundColor = '#f44336'; // Vermelho
        break;
      default:
        backgroundColor = '#757575'; // Cinza
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 4px',
      },
    };
  };

  const messages = {
    allDay: 'Dia inteiro',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Não há agendamentos neste período.',
    showMore: (total: number) => `+${total} mais`,
  };

  // Formatação customizada para 24 horas e pt-BR
  const formats = {
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
    eventTimeRangeStartFormat: ({ start }: { start: Date }) => moment(start).format('HH:mm'),
    eventTimeRangeEndFormat: ({ end }: { end: Date }) => moment(end).format('HH:mm'),
    dayFormat: (date: Date, culture?: string, localizer?: any) =>
      moment(date).format('dddd, D [de] MMMM'),
    dayHeaderFormat: (date: Date, culture?: string, localizer?: any) =>
      moment(date).format('dddd, D [de] MMMM'),
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${moment(start).format('D [de] MMMM')} - ${moment(end).format('D [de] MMMM, YYYY')}`,
    agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${moment(start).format('D [de] MMMM')} - ${moment(end).format('D [de] MMMM, YYYY')}`,
    agendaTimeFormat: (date: Date) => moment(date).format('HH:mm'),
    agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
    monthHeaderFormat: (date: Date) => moment(date).format('MMMM [de] YYYY'),
    monthDayHeaderFormat: (date: Date) => moment(date).format('dddd D'),
    weekHeaderFormat: (date: Date) => moment(date).format('D [de] MMMM'),
    weekdayFormat: (date: Date) => {
      // Formato abreviado para o cabeçalho do calendário em português
      // 'ddd' retorna: dom, seg, ter, qua, qui, sex, sáb
      return moment(date).format('ddd');
    },
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Calendário de Agendamentos
        </Typography>
        <Tooltip title="Criar um novo agendamento">
          <span>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/schedules/new')}
              disabled={loading}
            >
              Novo Agendamento
            </Button>
          </span>
        </Tooltip>
      </Box>

      <Card>
        <CardContent>
          {loading && videos.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              {/* Controles do calendário */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                {/* Navegação */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Mês anterior">
                    <Button size="small" onClick={goToPrev} startIcon={<NavigateBeforeIcon />}>
                      Anterior
                    </Button>
                  </Tooltip>
                  <Tooltip title="Hoje">
                    <Button size="small" onClick={goToToday} startIcon={<TodayIcon />}>
                      Hoje
                    </Button>
                  </Tooltip>
                  <Tooltip title="Próximo mês">
                    <Button size="small" onClick={goToNext} endIcon={<NavigateNextIcon />}>
                      Próximo
                    </Button>
                  </Tooltip>
                  <Typography variant="h6" sx={{ ml: 2, minWidth: 200 }}>
                    {moment(currentDate).format(view === 'month' ? 'MMMM [de] YYYY' : view === 'week' ? 'DD/MM/YYYY' : 'DD/MM/YYYY')}
                  </Typography>
                </Stack>

                {/* Seletor de visualização */}
                <ToggleButtonGroup
                  value={view}
                  exclusive
                  onChange={(_, newView) => {
                    if (newView && (newView === 'month' || newView === 'week' || newView === 'day' || newView === 'agenda')) {
                      handleViewChange(newView as CalendarView);
                    }
                  }}
                  size="small"
                >
                  <ToggleButton value="month">Mês</ToggleButton>
                  <ToggleButton value="week">Semana</ToggleButton>
                  <ToggleButton value="day">Dia</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Legenda */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Legenda:
                </Typography>
                <Chip label="Agendado" size="small" sx={{ bgcolor: '#1565d8', color: 'white' }} />
                <Chip label="Pendente" size="small" sx={{ bgcolor: '#ff9800', color: 'white' }} />
                <Chip label="Processando" size="small" sx={{ bgcolor: '#9c27b0', color: 'white' }} />
                <Chip label="Publicado" size="small" sx={{ bgcolor: '#4caf50', color: 'white' }} />
                <Chip label="Falhou" size="small" sx={{ bgcolor: '#f44336', color: 'white' }} />
              </Box>

              {/* Calendário */}
              <Box sx={{ height: 600, mt: 2 }}>
                {events.length === 0 && !loading ? (
                  <EmptyState
                    title="Nenhum agendamento encontrado"
                    description="Comece criando seu primeiro agendamento de vídeo."
                    action={{
                      label: 'Criar primeiro agendamento',
                      onClick: () => navigate('/schedules/new'),
                    }}
                  />
                ) : (
                  <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    view={view}
                    date={currentDate}
                    onNavigate={handleNavigate}
                    onView={handleViewChange}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    selectable
                    eventPropGetter={eventStyleGetter}
                    messages={messages}
                    formats={formats}
                    culture="pt-BR"
                  />
                )}
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

