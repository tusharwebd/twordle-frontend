import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Snackbar,
  Alert,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/system';
import GamepadIcon from '@mui/icons-material/Gamepad';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate, useSearchParams } from 'react-router-dom';
import io from 'socket.io-client';
import Game from './Game';

// Initialize socket connection
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://web-production-4aa72.up.railway.app';

const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  upgrade: false,
  cors: {
    origin: "*"
  },
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000
});

const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32',
    },
    secondary: {
      main: '#5C6BC0',
    },
    background: {
      default: '#F5F5F5',
    },
    grey: {
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
  },
});

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  borderRadius: '16px',
  boxShadow: '0 3px 5px 2px rgba(0, 0, 0, .1)',
  background: 'rgba(255, 255, 255, 0.9)',
}));

const StyledButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
  padding: theme.spacing(1, 4),
  borderRadius: '25px',
}));

const CopyLinkBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: '#f5f5f5',
  borderRadius: theme.spacing(1),
  width: '100%',
  maxWidth: '600px',
}));

function App() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [gameState, setGameState] = useState('init');
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Handle URL parameters and game joining
  useEffect(() => {
    const urlGameId = searchParams.get('gameId');
    if (urlGameId && gameState === 'init' && !isJoining) {
      console.log('Found gameId in URL:', urlGameId);
      setGameId(urlGameId);
      setIsJoining(true);
      // Add a small delay to ensure socket connection is established
      setTimeout(() => {
        socket.emit('join_game', { game_id: urlGameId });
      }, 1000);
    }
  }, [searchParams, gameState, isJoining]);

  // Socket event handlers
  useEffect(() => {
    const handleGameCreated = (data) => {
      console.log('Game created:', data);
      setGameId(data.game_id);
      setPlayerId(data.player_id);
      setGameState(data.status);
      setSuccessMessage('Game created successfully! Share the game link with your friend.');
      setShowSuccess(true);
      navigate(`?gameId=${data.game_id}`, { replace: true });
    };

    const handleGameJoined = (data) => {
      console.log('Game joined:', data);
      setPlayerId(data.player_id);
      setGameState('playing');
      setSuccessMessage('Successfully joined the game!');
      setShowSuccess(true);
      setIsJoining(false);
    };

    const handleGameStart = (data) => {
      console.log('Game starting:', data);
      setGameState('playing');
    };

    const handleError = (data) => {
      console.error('Error:', data);
      setError(data.message);
      setIsJoining(false);
      if (data.message === 'Game not found or full') {
        navigate('/', { replace: true });
        setGameId('');
        setGameState('init');
      }
    };

    socket.on('game_created', handleGameCreated);
    socket.on('game_joined', handleGameJoined);
    socket.on('game_start', handleGameStart);
    socket.on('error', handleError);

    // Ensure socket connection is established
    socket.connect();

    return () => {
      socket.off('game_created', handleGameCreated);
      socket.off('game_joined', handleGameJoined);
      socket.off('game_start', handleGameStart);
      socket.off('error', handleError);
    };
  }, [navigate]);

  const handleCreateGame = () => {
    socket.emit('create_game');
  };

  const handleJoinGame = () => {
    if (!gameId) {
      setError('Please enter a game ID');
      return;
    }
    socket.emit('join_game', { game_id: gameId });
    navigate(`?gameId=${gameId}`, { replace: true });
  };

  const handleCloseSnackbar = () => {
    setShowSuccess(false);
    setError('');
    setCopySuccess(false);
  };

  const copyGameUrl = () => {
    const url = `${window.location.origin}?gameId=${gameId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }).catch((err) => {
      setError('Failed to copy URL');
    });
  };

  const renderCopyLink = () => (
    <CopyLinkBox>
      <Typography variant="body1" color="text.secondary">
        Game URL:
      </Typography>
      <Typography
        variant="body1"
        sx={{
          backgroundColor: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          flexGrow: 1,
          textAlign: 'left',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {`${window.location.origin}?gameId=${gameId}`}
      </Typography>
      <Tooltip title="Copy URL" placement="top">
        <IconButton onClick={copyGameUrl} color="primary">
          <ContentCopyIcon />
        </IconButton>
      </Tooltip>
    </CopyLinkBox>
  );

  if (gameState === 'playing' || gameState === 'waiting') {
    return (
      <ThemeProvider theme={theme}>
        <Container maxWidth="lg">
          <Box sx={{ 
            minHeight: '100vh', 
            py: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
          }}>
            <Game gameId={gameId} playerId={playerId} socket={socket} />
            {gameState === 'waiting' && renderCopyLink()}
            <Snackbar
              open={copySuccess}
              autoHideDuration={3000}
              onClose={() => setCopySuccess(false)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert severity="success" sx={{ width: '100%' }}>
                Game URL copied to clipboard!
              </Alert>
            </Snackbar>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            py: 4,
          }}
        >
          <StyledPaper elevation={3}>
            <Typography variant="h1" gutterBottom color="primary">
              Wordle Duel
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Challenge your friends in real-time Wordle battles!
            </Typography>

            <Grid container spacing={2} direction="column" sx={{ mt: 4 }}>
              <Grid item>
                <StyledButton
                  variant="contained"
                  color="primary"
                  onClick={handleCreateGame}
                  startIcon={<GamepadIcon />}
                  fullWidth
                >
                  Create New Game
                </StyledButton>
              </Grid>

              <Grid item>
                <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
                  - OR -
                </Typography>
              </Grid>

              <Grid item>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Game ID"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <StyledButton
                  variant="contained"
                  color="secondary"
                  onClick={handleJoinGame}
                  startIcon={<GroupAddIcon />}
                  fullWidth
                >
                  Join Game
                </StyledButton>
              </Grid>
            </Grid>
          </StyledPaper>

          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity="error"
              sx={{ width: '100%' }}
            >
              {error}
            </Alert>
          </Snackbar>

          <Snackbar
            open={showSuccess}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity="success"
              sx={{ width: '100%' }}
            >
              {successMessage}
            </Alert>
          </Snackbar>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;