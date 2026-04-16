console.log('Бот запускается...');

setInterval(() => {
  console.log('Бот жив. Время:', new Date().toISOString());
}, 10000);

console.log('Тестовый бот запущен. Ничего больше не делает.');