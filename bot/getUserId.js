const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const CLIENT_ID = 'gp762nuuoqcoxypju8c569th9wz7q5'; // From brawl_bit_bot
const ACCESS_TOKEN = 'Bearer kx3hj0f5g82jjn4vy5paa11hwwrj96'; 

async function getBotUserId() {
  const res = await fetch('https://api.twitch.tv/helix/users?login=brawl_bit_bot', {
    method: 'GET',
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': ACCESS_TOKEN
    }
  });

  const data = await res.json();
  console.log(data);
}

getBotUserId();
