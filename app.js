const express = require('express');


const app = express();

app.use(express.json())

app.get('/home', (req, res) => {
  res.status(200).send({id:42069, username: 'Mikołaj', steps: 2000, maxsteps: 20000, achievements: {calories: 630, distance: 9600, water: 1200, basketball: 92, soccer: 26, squats: 42}, stats:{calories: 1513, maxcalories: 2300, carbs: 150, maxcarbs: '263-410', protein: 60, maxprotein: '70-117', fats: 55, maxfats: '65-78'}, events:[{typeofevent: 'food',name: 'Obiad', description: 'Sałatka z pieczonym łososiem', date: '15-12-2023', timeofday: '14:30', eventtimelength: '30 min', calories: '420', carbs: '12', proteins: '16', fats: '7'},{typeofevent: 'trening',name: 'Trening', description: 'Trening pleców', date: '15-12-2023', timeofday: '16:30', eventtimelength: '90 min'},{typeofevent: 'food',name: 'Obiad', description: 'Sałatka z pieczonym łososiem', date: '15-12-2023', timeofday: '14:30', eventtimelength: '30 min', calories: '420', carbs: '12', proteins: '16', fats: '7'},{typeofevent: 'trening',name: 'Trening', description: 'Trening pleców', date: '15-12-2023', timeofday: '16:30', eventtimelength: '90 min'}]}).end();
});

const PORT = parseInt(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;