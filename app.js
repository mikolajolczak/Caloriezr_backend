const express = require('express');


const app = express();

app.use(express.json())

app.get('/home', (req, res) => {
  res.status(200).send({ id: 42069, username: 'Mikołaj', steps: 2000, maxsteps: 20000, achievements: [{ description: 'calories', value: 630 }, { description: 'distance', value: 9600 }, { description: 'water', value: 1200 }, { description: 'basketball', value: 92 }, { description: 'soccer', value: 26 }, { description: 'squats', value: 42 }], stats: { calories: 1513, maxcalories: 2300, carbs: 150, maxcarbs: '263-410', protein: 60, maxprotein: '70-117', fats: 55, maxfats: '65-78' }, events: [{ typeofevent: 'food', name: 'Obiad', description: 'Sałatka z pieczonym łososiem', date: '15-12-2023', timeofday: '14:30', eventtimelength: '30 min', calories: '420', carbs: '12', proteins: '16', fats: '7' }, { typeofevent: 'trening', name: 'Trening', description: 'Trening pleców', date: '15-12-2023', timeofday: '16:30', eventtimelength: '90 min' }, { typeofevent: 'food', name: 'Obiad', description: 'Sałatka z pieczonym łososiem', date: '15-12-2023', timeofday: '14:30', eventtimelength: '30 min', calories: '420', carbs: '12', proteins: '16', fats: '7' }, { typeofevent: 'trening', name: 'Trening', description: 'Trening pleców', date: '15-12-2023', timeofday: '16:30', eventtimelength: '90 min' }]}).end();
});

app.get('/scaner', (req,res)=>{
  res.status(200).send({recent:[{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 2, unit:'g' ,score:'8.5', name:'Precel słony', description:'Pieczywo', sizeofproduct: '100', caloriesperhundred: '13'}], favourites:[{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'},{id: 1, unit:'ml' ,score:'5.5', name:'Dzik Energy Mango', description:'Napój energetyczny', sizeofproduct: '500', caloriesperhundred: '123'}]})
})

app.get('/week', (req,res)=>{
  
})

const PORT = parseInt(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;