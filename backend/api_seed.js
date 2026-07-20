const axios = require('axios');

async function seed() {
  const API = 'http://localhost:8000';
  
  try {
    console.log('Registering Merchant...');
    await axios.post(`${API}/auth/register`, {
      email: 'store5@test.com', password: 'password123', role: 'Merchant',
      name: 'Test Store 5', phone: '0810000005'
    });
    const mLogin = await axios.post(`${API}/auth/login`, { email: 'store5@test.com', password: 'password123', role: 'Merchant' });
    const mToken = mLogin.data.access_token;
    console.log('Merchant logged in.');

    console.log('Registering Driver...');
    await axios.post(`${API}/auth/register`, {
      email: 'driver5@test.com', password: 'password123', role: 'Driver',
      name: 'Test Driver 5', phone: '0810000006'
    });
    const dLogin = await axios.post(`${API}/auth/login`, { email: 'driver5@test.com', password: 'password123', role: 'Driver' });
    const dToken = dLogin.data.access_token;
    console.log('Driver logged in.');

    console.log('Creating Order...');
    const orderRes = await axios.post(`${API}/orders`, {
      receiverName: 'Test Cust',
      receiverPhone: '0810000006',
      address: 'BKK',
      productName: 'GPS Test Box',
      quantity: 1,
      price: 1500,
      weight: 5.0,
      lat: 13.7563,
      lng: 100.5018
    }, { headers: { Authorization: `Bearer ${mToken}` } });
    
    const order = orderRes.data;
    console.log('Order created:', order.trackingNumber);

    console.log('Assigning Driver (Accepting order)...');
    await axios.patch(`${API}/orders/${order.id}/accept`, {}, { headers: { Authorization: `Bearer ${dToken}` } });
    await axios.patch(`${API}/orders/${order.id}/pickup`, {}, { headers: { Authorization: `Bearer ${dToken}` } });
    await axios.patch(`${API}/orders/${order.id}/ship`, {}, { headers: { Authorization: `Bearer ${dToken}` } });
    console.log('Order is now SHIPPING!');
    
    console.log('\n--- SEED COMPLETE ---');
    console.log(`TrackingNumber=${order.trackingNumber}`);
    console.log(`OrderId=${order.id}`);

  } catch (err) {
    console.error('Failed:', err.response?.data || err.message);
  }
}

seed();
