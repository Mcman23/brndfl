import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Brandfull Server] running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
