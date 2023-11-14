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

const getTimeFromDate = (date) => {
  let timeWithSeconds = date.toISOString().slice(date.toISOString().indexOf('T') + 1, date.toISOString().indexOf('Z'))
  return timeWithSeconds.slice(0,timeWithSeconds.indexOf('.')-3)
}

const getDateFromDate = (date) => {
  return date.toISOString().substring(0,date.toISOString().indexOf('T'))
}

const mergeEvents = (trainings, foods) => {
  let result = [];
  let i = 0
  let j=0
  while (i < trainings.length && j < foods.length) {
    if (trainings[i].timeofday > foods[j].timeofday) {
      result.push(foods[j])
      j++
    } else {
      result.push(trainings[i])
      i++
    }
  }
  result = result.concat(trainings.slice(i), foods.slice(j))
  return result
}

const connection = createUnixSocketPool();
app.use(express.json())
connection.connect()
app.post('/home', (req, res) => {
  const dailyUserInfoQuery = `SELECT u.Name AS User_name, i.Max_Steps, i.Steps, i.Date, i.Calories, i.Carbs, i.Proteins, i.Fats, i.Max_Calories, i.Max_Carbs, i.Max_Proteins, i.Max_Fats FROM User AS u, UserInfo AS i WHERE u.Id=i.User_Id AND u.id=${req.body.id}`
  const dailyUserAchievementsInfoQuery = `SELECT acti.Name, achi.Value, acti.Unit FROM User AS u, Achievements as achi, Activities acti where u.Id=achi.User_Id AND u.Id=${req.body.id} AND acti.Id=achi.Activity_Id`
  const dailyUserTrainingsQuery = `SELECT train.Name, train.Description, train.Time, trainu.Date FROM User AS u, TrainingEvents as train, Training_User as trainu where u.Id=trainu.User_Id AND u.Id=${req.body.id} AND train.Id=trainu.Training_Id`
  const dailyUserFoodsQuery = `SELECT food.Description, food.Name, food.Preperation_Time, food.Calories, food.Carbs, food.Proteins, food.Fats, foodu.Date FROM User AS u, FoodEvents as food, Food_User as foodu where u.Id=foodu.User_Id AND u.Id=${req.body.id} AND food.Id=foodu.Food_Id`
  connection.query(dailyUserInfoQuery, (err, rows) => {
    if (err) throw err
    let dailyUserInfo = rows[0];
    connection.query(dailyUserAchievementsInfoQuery, (err, rows) => {
      let dailyUserAchievements = []
      if (err) throw err
      rows.forEach(row => {
        dailyUserAchievements.push({description:row.Name,value:row.Value,unit:row.Unit})
      });
      connection.query(dailyUserTrainingsQuery, (err, rows) => {
        let dailyUserTrainings =[]
        if (err) throw err
        rows.forEach(row => {
          dailyUserTrainings.push({name:row.Name, timeofday: getTimeFromDate(row.Date), date:getDateFromDate(row.Date), description:row.Description, eventtimelength: getTimeFromDate(row.Time), typeofevent: "training"})
        });
        connection.query(dailyUserFoodsQuery, (err, rows) => {
          let dailyUserFoods = []
          rows.forEach(row => {
            dailyUserFoods.push({name:row.Name,timeofday:getTimeFromDate(row.Date),date:getDateFromDate(row.Date),description:row.Description, eventtimelength:getTimeFromDate(row.Preperation_Time), calories:row.Calories,carbs: row.Carbs, proteins: row.Proteins,fats: row.Fats,typeofevent: "food"})
          });
          let dailyUserEvents = mergeEvents(dailyUserTrainings, dailyUserFoods)
          res.status(200).send({ id: req.body.id, username: dailyUserInfo.User_name, steps: dailyUserInfo.Steps, maxsteps: dailyUserInfo.Max_Steps, achievements: dailyUserAchievements, stats: [{ value: dailyUserInfo.Calories, maxvalue: dailyUserInfo.Max_Calories, description: 'Kalorie', unit: 'kcal' }, { value: dailyUserInfo.Carbs, maxvalue: dailyUserInfo.Max_Carbs, description: 'Węgl.', unit: 'g' }, { value: dailyUserInfo.Proteins, maxvalue: dailyUserInfo.Max_Proteins, description: 'Białka', unit: 'g' }, { value: dailyUserInfo.Fats, maxvalue: dailyUserInfo.Max_Fats, description: 'Tłuszcze', unit: 'g' }], events: dailyUserEvents }).end();
        })
      })
    })
  })
});

app.post('/user/maxsteps', (req, res) => {
  const UserId = req.body.id;
  const NewMaxSteps= req.body.maxsteps
  const updateMaxSteps = `UPDATE UserInfo SET Max_Steps=${NewMaxSteps} WHERE User_Id=${UserId}`
  connection.query(updateMaxSteps, (err, rows) => {
    if (err) throw err
    res.status(200).send()
  })
})

app.post('/scaner', (req, res) => {
  const UserId = req.body.id;
  const RecentQuery = `SELECT * FROM Recent_Products, Products WHERE Recent_Products.User_Id=${UserId} and Recent_Products.Products_Id=Products.Id`
  const FavouritesQuery = `SELECT * FROM Favourite_Products, Products WHERE Favourite_Products.User_Id=${UserId} and Favourite_Products.Products_Id=Products.Id`
  connection.query(FavouritesQuery, (err, rows) => {
    if (err) throw err
    let favouriteProducts = []
    rows.forEach(row => {
      favouriteProducts.push({id: row.Products_Id, unit:row.Size_Unit ,score:row.Score, name:row.Name, description:row.Description, sizeofproduct: row.Size, caloriesperhundred: row.Calories_Per_Hundred})
    });
    connection.query(RecentQuery, (err, rows) => {
      let recentProducts = []
    rows.forEach(row => {
      recentProducts.push({id: row.Products_Id, unit:row.Size_Unit ,score:row.Score, name:row.Name, description:row.Description, sizeofproduct: row.Size, caloriesperhundred: row.Calories_Per_Hundred})
    });
      res.status(200).send({ recent: recentProducts, favourites: favouriteProducts })
     })
  })
})

app.post('/add/food', (req, res) => {
  const UserId = req.body.id
  //tak naprawde to powinno byc FoodId
  const Calories = req.body.calories
  const Carbons = req.body.carbons
  const Proteins = req.body.proteins
  const Fats = req.body.fats
  const UpdateUserInfoQuery = `UPDATE UserInfo SET Proteins=Proteins+${Proteins}, Carbs=Carbs+${Carbons}, Calories=Calories+${Calories}, Fats=Fats+${Fats} WHERE User_Id=${UserId}`
  connection.query(UpdateUserInfoQuery, (err, rows) => {
    if (err) throw err
    res.status(200).send()
  })

})

app.post('/add/favourite', (req, res) => {
  const UserId = req.body.id
  const Barcode = req.body.barcode
  const FindProductQuery = `SELECT * FROM Products WHERE Products.Barcode=${Barcode}`
  connection.query(FindProductQuery, (err, rows) => {
    if (err) throw err
    if (rows.length > 0) {
      connection.query(`INSERT INTO Recent_Products (User_Id, Products_Id) VALUES (${UserId},${rows[0].Id});`, (err, rows) => {
        if (err) throw err
        res.status(200).send()
      })
    }
  })
})

const PORT = parseInt(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;