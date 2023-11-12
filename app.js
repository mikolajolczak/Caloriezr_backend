const express = require('express');
const mysql = require('mysql');
const app = express();
const createUnixSocketPool = () => {
  return mysql.createConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    socketPath: process.env.INSTANCE_UNIX_SOCKET,
  });
};
const connection = createUnixSocketPool();
app.use(express.json())
connection.connect()
app.post('/home', (req, res) => {
  let dailyUserInfo = []
  let dailyUserAchievements = []
  let dailyUserTrainings = []
  const dailyUserInfoQuery = `SELECT u.Name AS User_name, i.Max_Steps, i.Steps, i.Date, i.Calories, i.Carbs, i.Proteins, i.Fats, i.Max_Calories, i.Max_Carbs, i.Max_Proteins, i.Max_Fats FROM User AS u, UserInfo AS i WHERE u.Id=i.User_Id AND u.id=${req.body.id}`
  const dailyUserAchievementsInfoQuery = `SELECT acti.Name, achi.Value, acti.Unit FROM User AS u, Achievements as achi, Activities acti where u.Id=achi.User_Id AND u.Id=${req.body.id} AND acti.Id=achi.Activity_Id`
  const dailyUserTrainingsQuery = `SELECT * FROM User AS u, TrainingEvents as train, Training_User as trainu where u.Id=trainu.User_Id AND u.Id=${req.body.id} AND train.Id=trainu.Training_Id`
  connection.query(dailyUserInfoQuery, (err, rows) => {
    if (err) throw err
    dailyUserInfo = rows[0]
  })
  connection.query(dailyUserAchievementsInfoQuery, (err, rows) => {
    if (err) throw err
    rows.forEach(row => {
      dailyUserAchievements.push({ description: row.Name, value: row.Value, unit: row.Unit })
    });
  })
  connection.query(dailyUserTrainingsQuery, (err, rows) => {
    if (err) throw err
    rows.forEach(row => {
      dailyUserTrainings.push({ typeofevent: 'trening', name: row.Name, description: row.Description, date: row.Date, timeofday: row.Date, eventtimelength: row.Time })
    });
  })
  res.status(200).send({ id: req.body.id, username: dailyUserInfo.User_Name, steps: dailyUserInfo.Steps, maxsteps: dailyUserInfo.Max_Steps, achievements: dailyUserAchievements, stats: [{ value: dailyUserInfo.Calories, maxvalue: dailyUserInfo.Max_Calories, description: 'Kalorie', unit: 'kcal' }, { value: dailyUserInfo.Carbs, maxvalue: dailyUserInfo.Max_Carbs, description: 'Węgl.', unit: 'g' }, { value: dailyUserInfo.Proteins, maxvalue: dailyUserInfo.Max_Proteins, description: 'Białka', unit: 'g' }, { value: dailyUserInfo.Fats, maxvalue: dailyUserInfo.Max_Fats, description: 'Tłuszcze', unit: 'g' }], events: dailyUserTrainings }).end();
});

app.post('/add/steps', (req, res) => {

})

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