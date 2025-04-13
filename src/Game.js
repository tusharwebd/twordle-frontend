import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  ThemeProvider,
  createTheme,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/system';
import PropTypes from 'prop-types';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32',
    },
    secondary: {
      main: '#5C6BC0',
    },
  },
});

const GameTile = styled(Paper)(({ status, isShaking }) => ({
  width: '60px',
  height: '60px',
  margin: '4px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '2rem',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  backgroundColor: status === 'correct' ? '#6aaa64' :
                  status === 'present' ? '#c9b458' :
                  status === 'absent' ? '#787c7e' : '#ffffff',
  color: status ? '#ffffff' : '#000000',
  transition: 'all 0.3s ease',
  animation: isShaking ? 'shake 0.5s ease-in-out' : 'none',
}));

const GameBoard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2),
  borderRadius: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
}));

function Game({ gameId, playerId, socket }) {
  const [gameState, setGameState] = useState(playerId === 'player1' ? 'waiting' : 'playing');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [opponentGuesses, setOpponentGuesses] = useState([]);
  const [winner, setWinner] = useState(null);
  const [word, setWord] = useState(null);
  const [canGuess, setCanGuess] = useState(true);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const handleGameStart = (data) => {
      console.log('Game started', data);
      setGameState('playing');
    };

    const handleGuessMade = (data) => {
      console.log('Guess made:', data);
      if (data.player_id === playerId) {
        setGuesses(prev => [...prev, { word: data.guess, result: data.result }]);
        setCurrentGuess('');
      } else {
        setOpponentGuesses(prev => [...prev, { word: data.guess, result: data.result }]);
      }
    };

    const handleGameOver = (data) => {
      console.log('Game over:', data);
      setGameState('finished');
      setWinner(data.winner);
      setWord(data.word);
    };

    const handlePlayerDisconnected = () => {
      setGameState('disconnected');
    };

    const handleError = (data) => {
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
      }, 500);
    };

    socket.on('game_start', handleGameStart);
    socket.on('guess_made', handleGuessMade);
    socket.on('game_over', handleGameOver);
    socket.on('player_disconnected', handlePlayerDisconnected);
    socket.on('error', handleError);

    if (playerId === 'player2') {
      setGameState('playing');
    }

    return () => {
      socket.off('game_start', handleGameStart);
      socket.off('guess_made', handleGuessMade);
      socket.off('game_over', handleGameOver);
      socket.off('player_disconnected', handlePlayerDisconnected);
      socket.off('error', handleError);
    };
  }, [socket, playerId]);

  useEffect(() => {
    setCanGuess(guesses.length < MAX_GUESSES && gameState === 'playing');
  }, [guesses, gameState]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!canGuess) return;

      if (event.key === 'Enter') {
        if (currentGuess.length === WORD_LENGTH) {
          console.log('Submitting guess:', currentGuess, 'Player:', playerId);
          socket.emit('make_guess', {
            game_id: gameId,
            player_id: playerId,
            guess: currentGuess
          });
        }
      } else if (event.key === 'Backspace') {
        setCurrentGuess(prev => prev.slice(0, -1));
      } else if (currentGuess.length < WORD_LENGTH && event.key.match(/^[a-z]$/i)) {
        setCurrentGuess(prev => prev + event.key.toLowerCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameId, gameState, playerId, socket, canGuess]);

  const renderBoard = (guessArray, isOpponent = false) => (
    <GameBoard elevation={3}>
      <Typography variant="h5" gutterBottom color="primary">
        {isOpponent ? "Opponent's Guesses" : 'Your Guesses'}
      </Typography>
      <Box>
        {guessArray.map((guess, i) => (
          <Grid container justifyContent="center" key={i}>
            {guess.word.split('').map((letter, j) => (
              <GameTile key={j} status={guess.result[j]} elevation={2}>
                {letter}
              </GameTile>
            ))}
          </Grid>
        ))}
        {[...Array(MAX_GUESSES - guessArray.length)].map((_, i) => (
          <Grid container justifyContent="center" key={`empty-${i}`}>
            {[...Array(WORD_LENGTH)].map((_, j) => (
              <GameTile 
                key={j} 
                elevation={1}
                isShaking={!isOpponent && i === 0 && isShaking}
              >
                {!isOpponent && i === 0 && currentGuess[j] ? currentGuess[j] : ''}
              </GameTile>
            ))}
          </Grid>
        ))}
      </Box>
    </GameBoard>
  );

  const renderWaitingScreen = () => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '50vh' 
    }}>
      <CircularProgress size={60} sx={{ mb: 4 }} />
      <Typography variant="h4" color="primary" gutterBottom>
        Waiting for opponent to join...
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Share this game ID with your friend: {gameId}
      </Typography>
    </Box>
  );

  const renderGameOverScreen = () => (
    <Box sx={{ textAlign: 'center', mb: 4 }}>
      <Typography variant="h4" color={winner === playerId ? 'primary' : 'error'}>
        {winner ? (winner === playerId ? 'You Won!' : 'Opponent Won!') : 'Game Over!'}
      </Typography>
      <Typography variant="h6" color="text.secondary">
        The word was: {word}
      </Typography>
    </Box>
  );

  if (gameState === 'waiting' && playerId === 'player1') {
    return renderWaitingScreen();
  }

  if (gameState === 'disconnected') {
    return (
      <Typography variant="h4" color="error" align="center">
        Opponent disconnected. Game ended.
      </Typography>
    );
  }

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
          <Typography variant="h3" gutterBottom color="primary">
            Wordle Duel
          </Typography>

          {gameState === 'finished' && renderGameOverScreen()}

          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} md={6}>
              {renderBoard(guesses)}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderBoard(opponentGuesses, true)}
            </Grid>
          </Grid>

          {gameState === 'playing' && canGuess && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 4 }}>
              Type your guess and press Enter to submit
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
            Game ID: {gameId} | Player: {playerId} | Game State: {gameState}
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

Game.propTypes = {
  gameId: PropTypes.string.isRequired,
  playerId: PropTypes.string.isRequired,
  socket: PropTypes.object.isRequired,
};

export default Game;