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

app.post('/meal', (req, res) => {
  const UserId = req.body.id
  const getMealsQuery = `SELECT * From FoodEvents, Food_User WHERE Id IN (SELECT Food_Id From Food_User WHERE User_Id=${UserId}) AND Food_User.Food_Id=FoodEvents.Id`
  connection.query(getMealsQuery, (err, rows) => {
    if (err) throw err
    res.status(200).send({meals: rows})
  })
})
//new
app.post('/get/user', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password,Email], (err, rows) => {
    if (err) throw err
    if (rows.length > 0) {
      res.status(200).send({ name: rows[0].Name, step_limit: rows[0].Step_Limit, water_limit: rows[0].Water_Limit, calories_limit: rows[0].Calories_Limit,carbs_limit: rows[0].Carbs_Limit,fats_limit: rows[0].Fats_Limit,Proteins_limit: rows[0].Proteins_Limit})
    }
    else {
      res.status(400).send()
    }
  })
})

app.post('/change/walk/limit', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const NewLimit = req.body.new_limit
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, rows) => { 
    if (err) {
      res.status(500).send()
      throw err
    }
    if (rows.length > 0) {
      const updateStepLimitQuery = `Update Users SET Step_Limit = ? WHERE Id = ?`
      connection.query(updateStepLimitQuery, [NewLimit, rows[0].Id], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send()
      })
    }
  })
})

app.post('/add/user', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email
  const Name = req.body.name
  const Timezone = req.body.timezone
  const addUserQuery = `INSERT INTO Users (Password, Email, Name, Timezone) VALUES (?,?,?,?)`
  connection.query(addUserQuery, [Password, Email, Name, Timezone], (err, rows) => {
    if (err) {
      res.status(500).send()
      throw err
    };
    res.status(200).send()
  })
})

app.post('/add/walk', (req, res) => {
  const Steps = req.body.steps  
  const Date_Start = req.body.date_start
  const Date_End = req.body.date_end
  const Password = req.body.password
  const Email = req.body.email
  const Length = req.body.length
  const findUserQuery = `SELECT Id FROM Users WHERE Password = ? AND Email = ?`
  connection.query(findUserQuery, [Password, Email], (err, rows) => {
    if (err) {
      res.status(500).send()
      throw err
    }
    if (rows.length > 0) {
      const findAllWalksFromUserQuery = `SELECT * FROM Walks WHERE User_Id = ? ORDER BY Date_End DESC`
      connection.query(findAllWalksFromUserQuery, [rows[0].Id], (err, rows) => {
        if (rows.length <= 0) {
          //insert
          const insertNewWalk = `INSERT INTO Walks (Steps, Date_Start, Date_End, Length, User_Id) VALUES (?, ?, ?, ?, (SELECT Id FROM Users WHERE Password = ? AND Email = ?));`
          connection.query(insertNewWalk, [Steps, new Date(Date_Start), new Date(Date_End), Length, Password, Email], (err, rows) => {
            if (err) {
              res.status(500).send(err)
              throw err
            }
            res.status(200).send()
          })
        } else {
            if (new Date(rows[0].Date_End).getHours() * 60 + new Date(rows[0].Date_End).getMinutes() + 10 < new Date(Date_End).getHours() * 60 + new Date(Date_End).getMinutes()) {
              const insertNewWalk = `INSERT INTO Walks (Steps, Date_Start, Date_End, Length, User_Id) VALUES (?, ?, ?, ?, (SELECT Id FROM Users WHERE Password = ? AND Email = ?));`
              connection.query(insertNewWalk, [Steps, new Date(Date_Start), new Date(Date_End), Length, Password, Email], (err, rows) => {
                if (err) {
                  res.status(500).send(err)
                  throw err
                }
                res.status(200).send()
              })
            } else {
              //update old
              const updateWalk = `UPDATE Walks SET Steps=?, Date_End=?, Length=? WHERE Id=?`
              connection.query(updateWalk, [rows[0].Steps+Steps, new Date(Date_End), rows[0].Length+Length, rows[0].Id], (err, rows) => {
                if (err) {
                  res.status(500).send(err)
                  throw err
                }
                res.status(200).send()
              })
            }
          
        }

      })
    } else {
      res.status(403).send()
    }
  })
})

app.post('/get/weekly/walk', (req, res) => {
  const Date_Start = req.body.date_start
  const Password = req.body.password;
  const Email = req.body.email;
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, rows) => {
    if (err) {
      res.status(500).send()
      throw err
    }
    if (rows.length > 0) {
      const getWeeklyWalksQuery = `SELECT Steps, Date_Start, Date_End, Length FROM Walks WHERE Date_Start >= ? AND Date_Start < ? AND User_Id = ? ORDER BY Date_End`
      connection.query(getWeeklyWalksQuery, [new Date(Date_Start), new Date(new Date(Date_Start).getFullYear(), new Date(Date_Start).getMonth(), new Date(Date_Start).getDate() + 7), rows[0].Id], (err, rows) => {
        if (err) {
          res.status(500).send()
        }
        res.status(200).send(rows)
      })
    } else {
      res.status(403).send()
    }
  })
})

app.post('/get/weekly/group/walk', (req, res) => {
  const Date_Start = req.body.date_start
  const Password = req.body.password;
  const Email = req.body.email;
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, rows) => {
    if (err) {
    res.status(500).send()
    throw err
    }
    if (rows.length > 0) {
      const getDailyInfoQuery = `SELECT SUM(Steps) as Sum_Steps, SUM(Length) as Sum_Length,Date(Date_Start) as Day FROM Walks WHERE Date_Start >= ? AND Date_Start < ? AND User_Id = ? GROUP BY Day`
      connection.query(getDailyInfoQuery, [new Date(Date_Start), new Date(new Date(Date_Start).getFullYear(), new Date(Date_Start).getMonth(), new Date(Date_Start).getDate() + 7), rows[0].Id], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send(rows)
      })
    } else {
      res.status(500).send()
    }
  })
})

app.post('/get/products/favourite', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password,Email], (err, rows) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (rows.length > 0) {
      const getFavouriteProducts = `SELECT * FROM Favourite_Products LEFT JOIN Products ON Favourite_Products.Product_Id = Products.Id LEFT JOIN Product_Groups ON Products.Group_Id = Product_Groups.Id WHERE Favourite_Products.User_Id = ? ORDER BY Products.Id`
      connection.query(getFavouriteProducts, [rows[0].Id], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        if (rows.length > 0) {
            res.status(200).send(rows)
        }
        else {
          res.status(200).send()
        }
      })
    }
    else {
      res.status(400).send()
    }
  })
})

app.post('/get/products/recent', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password,Email], (err, rows) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (rows.length > 0) {
      const getRecentProducts = `SELECT * FROM Recent_Searched LEFT JOIN Products ON Recent_Searched.Product_Id = Products.Id LEFT JOIN Product_Groups ON Products.Group_Id = Product_Groups.Id WHERE Recent_Searched.User_Id = ? ORDER BY Products.Id`
      connection.query(getRecentProducts, [rows[0].Id], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        if (rows.length > 0) {
            res.status(200).send(rows)
        }
        else {
          res.status(200).send()
        }
      })
    }
    else {
      res.status(400).send()
    }
  })
})

app.post('/get/product/info', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const Product_Id = req.body.id
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const getProductById = `SELECT * FROM Products WHERE Id = ?`
      connection.query(getProductById, [Product_Id], (err, products) => {
        if (err) {
          res.status(403).send()
          throw err
        }
        if (products.length == 1) {
          const searchProductAndUser = `SELECT COUNT(*) as Sum FROM Recent_Searched WHERE User_Id = ? AND Product_Id = ?`
          const addProductToRecent = `INSERT INTO Recent_Searched(Product_Id, User_Id) VALUES (?,?)`
          connection.query(searchProductAndUser, [users[0].Id, products[0].Id], (err, rows) => {
            if (err) {
              res.status(403).send()
              throw err
            }
            if (rows[0].Sum < 1) {
              connection.query(addProductToRecent, [users[0].Id, products[0].Id], (err, rows) => {
                if (err) {
                  res.status(403).send()
                  throw err
                }
              })
            }
          })
          const getProductIngredients = `SELECT * FROM Products_Ingredients LEFT JOIN Ingredients ON Products_Ingredients.Ingredient_Id = Ingredients.Id LEFT JOIN Ingredient_Types ON Ingredient_Types.Id = Ingredients.Type_Id WHERE Products_Ingredients.Product_Id = ? ORDER BY Products_Ingredients.Product_Id`
          connection.query(getProductIngredients, [products[0].Id], (err, ingredients) => {
            if (err) {
              res.status(500).send()
              throw err
            }
            console.log(ingredients)
            products[0] = {...products[0], "Ingredients": ingredients}
            res.status(200).send(products[0])
          })
          
        } else {
          res.status(403).send()
        }
      })
      
    } else {
      res.status(403).send()
    }
  })
})

app.post('/get/product/name', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const Name = req.body.name
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const getProductByBarcodeQuery = `SELECT * FROM Products WHERE Name LIKE ? LIMIT 5`
      connection.query(getProductByBarcodeQuery, ['%' + Name + '%'], (err, products) => {
        if (err) {
          res.status(403).send()
          throw err
        }
        res.status(200).send(products)
      })
    }
  })
})

app.post('/get/product/barcode', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const Barcode = req.body.barcode
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const getProductByBarcodeQuery = `SELECT * FROM Products WHERE Barcode = ?`
      connection.query(getProductByBarcodeQuery, [Barcode], (err, products) => {
        if (err) {
          res.status(403).send()
          throw err
        }
        if (products.length > 0) {
          res.status(200).send(products[0])
        }
        else {
          res.status(404).send()
        }
      })
    }
  })
})

app.post('/add/products/favourite', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const Product_Id = req.body.id
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const searchProductAndUser = `SELECT COUNT(*) as Sum FROM Favourite_Products WHERE User_Id = ? AND Product_Id = ?`
      connection.query(searchProductAndUser, [users[0].Id, Product_Id], (err, products) => {
        if (err) {
          res.status(403).send()
          throw err
        }
        if (products[0].Sum < 1) {
          const addProductToRecent = `INSERT INTO Favourite_Products(Product_Id, User_Id) VALUES (?,?)`
          connection.query(addProductToRecent, [Product_Id,users[0].Id], (err, rows) => {
            if (err) {
              res.status(403).send()
              throw err
            }
            res.status(200).send()
          })
        } else {
          res.status(500).send()
        }
      })
    }
  })
})

app.post('/del/products/favourite', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const Product_Id = req.body.id
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const delProductFromFavourite = `DELETE FROM Favourite_Products WHERE Product_Id=? AND User_Id = ?;`
      connection.query(delProductFromFavourite, [Product_Id, users[0].Id], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send()
      })
    }
  })
})

  app.post('/del/products/recent', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const Product_Id = req.body.id
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const delProductFromFavourite = `DELETE FROM Recent_Searched WHERE Product_Id=? AND User_Id = ?;`
      connection.query(delProductFromFavourite, [Product_Id, users[0].Id], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send()
      })
    }
  })
})

app.post('/add/meal', (req, res) => {
  const ProductsIdandQuantity = req.body.products
  const MealName = req.body.meal_name
  const Password = req.body.password
  const Email = req.body.email
  const MealDate = req.body.date
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(500).send()
      throw err
    }
    if (users.length > 0) {
      const addMealQuery = `INSERT INTO Meals(Name) VALUES (?)`
      connection.query(addMealQuery, [MealName], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        const getMealId = `SELECT * FROM Meals WHERE Name = ?`
        connection.query(getMealId, [MealName], (err, meal) => {
          if (err) {
            res.status(500).send()
            throw err
          }
          if(meal.length>0)
          {
            const addProductsToMeal = `INSERT INTO Products_Meals(Product_Id, Quantity, Meal_Id) VALUES ?`
            ProductsIdandQuantity.forEach(product => {
              product.push(meal[0].Id)
            });
            connection.query(addProductsToMeal, [ProductsIdandQuantity], (err, rows) => {
              if (err) {
                res.status(500).send()
                throw err
              }
              const addMealToUser = 'INSERT INTO Meal_Users(Meal_Id, User_Id, Date) VALUES (?,?,?)'
              connection.query(addMealToUser, [meal[0].Id, users[0].Id, new Date(MealDate)], (err, rows) => {
                if (err) {
                  res.status(500).send()
                  throw err
                }
                res.status(200).send()
              })
            })
          }
        })
        
      })
    }
  })
}) //assemble meal from Products and add product list to Product_meals add Meal to Meals and add to Meal_Users
app.post('/get/meal/name', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const MealName = req.body.name
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const getMealsByNameQuery = `SELECT * FROM Meals WHERE Name LIKE ?`
      connection.query(getMealsByNameQuery, ['%'+MealName+'%'], (err, meals) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send(meals)
      })
    }
  })
}) // get meal names TOP5

app.post('/get/weekly/meals', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const StartingDate = req.body.date
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const getMealsQuery = `SELECT * FROM Meal_Users INNER JOIN Meals ON Meal_Users.Meal_Id = Meals.Id WHERE User_Id = ? AND Meal_Users.Date BETWEEN ? AND ?`
      connection.query(getMealsQuery, [users[0].Id, new Date(StartingDate), new Date(new Date(StartingDate).getFullYear(), new Date(StartingDate).getMonth(), new Date(StartingDate).getDate() + 7)], (err, meals) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        const getProductsQuery = `SELECT Product_Id, Score, Size, Unit, Barcode, Group_Id, Name, Calories, Fats, Carbons, Proteins FROM Products_Meals INNER JOIN Products ON Products_Meals.Product_Id = Products.Id WHERE Products_Meals.Meal_Id = ?`
        for (let i = 0; i < meals.length; i++){
          console.log(meals[i])
          connection.query(getProductsQuery, [meals[i].Id], (err, products) => {
            if (err) {
              res.status(500).send()
              throw err
            }
            console.log(products)
            meals[i] = {...meals[i], "Products": products}
          })
        }
        res.status(200).send(meals)        
      })
    }
  })
  
})// get all meals products for them and their macros week

app.post('/get/meal/info', (req, res) => {
  const MealId = req.body.id
  const Password = req.body.password
  const Email = req.body.email
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const getMealProducts = `SELECT * FROM Products_Meals INNER JOIN Products ON Products_Meals.Product_Id = Products.Id WHERE Meal_Id = ?`
      connection.query(getMealProducts, [MealId], (err, products) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send(products)
      })
    }
  })
})// get products from meal

app.post('/add/water', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const Current_Day = req.body.date
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => { 
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) { 
      const getWaterCupUser = `SELECT * FROM Water_Users WHERE User_Id = ? AND Date = ?`
      connection.query(getWaterCupUser, [users[0].Id, new Date(Current_Day)], (err, waters) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        if (waters.length > 0) {
          const updateWaterState = `UPDATE Water_Users SET  Current_Water = Current_Water + 200 WHERE Id = ?`
          connection.query(updateWaterState, [waters[0].Id], (err, rows) => {
            if (err) {
              res.status(500).send()
              throw err
            }
            res.status(200).send()
          })
        }
        else {
          res.status(500).send()
        }
      })
      
    }
  })
})

app.post('/change/water/limit', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const newLimit = req.body.limit
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const setNewWaterLimit = `UPDATE Users SET Water_Limit = ? WHERE User_Id = ?`
      connection.query(setNewWaterLimit, [newLimit, users[0].Id], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send()
       })
    }
  })
})

app.post('/get/weekly/water', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const startingDate = req.body.date
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const getWeeklyWatersQuery = `SELECT * FROM Water_Users WHERE User_Id = ? AND Date BETWEEN ? AND ?;`
      connection.query(getWeeklyWatersQuery, [users[0].Id, new Date(startingDate), new Date(new Date(startingDate).getFullYear(), new Date(startingDate).getMonth(), new Date(startingDate).getDate() + 7)], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send(rows)
      })
    }
  })
})

app.post('/add/training', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const TrainingName = req.body.name
  const StartDate = req.body.start_date
  const EndDate = req.body.start_date
  const Exercises = req.body.exercises
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
    res.status(403).send()
    throw err
    }
    if (users.length > 0) {
      const insertNewTraining = `INSERT INTO Trainings(Name) VALUES (?)`
      connection.query(insertNewTraining, [TrainingName], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        const getTrainingId = `SELECT * FROM Trainings WHERE Name = ?;`
        connection.query(getTrainingId, [TrainingName], (err, trainings) => {
          if (err) {
            res.status(500).send()
            throw err
          }
          const connectTrainingToUser = `INSERT INTO Users_Trainings(User_Id, Training_Id, Date_Start, Date_End) VALUES (?,?,?,?)`
          connection.query(connectTrainingToUser, [users[0].Id, trainings[0].Id, new Date(StartDate), new Date(EndDate)], (err, rows) => {
            if (err) {
              res.status(500).send()
              throw err
            }
            for (let i = 0; i < Exercises.length; i++){
              Exercises[i].push(trainings[0].Id)
            }
            const addExercisesToTraining = `INSERT INTO Trainings_Exercises(Exercise_Id, Repetitions, Series, Distance, Training_Id) VALUES ?`
            connection.query(addExercisesToTraining, [Exercises], (err, rows) => {
              if (err) {
                res.status(500).send()
                throw err
              }
              res.status(200).send()
            })
          })
        })
        
      })
    }
  })
})

app.post('/get/training/name', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const trainingName = req.body.email
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) { 
      const getTrainingName = `SELECT SUM(Exercises.Calories_Loss) FROM Trainings INNER JOIN Trainings_Exercises ON Trainings.Id = Trainings_Exercises.Training_Id INNER JOIN Exercises ON Trainings_Exercises.Exercise_Id = Exercises.Id Where Trainings.Name LIKE ? GROUP BY Trainings_Id LIMIT 5;`
      connection.query(getTrainingName, ['%' + trainingName + '%'], (err, trainings) => {
        if (err) {
          res.status(500).send()
          throw err
        } 
        res.send(200).send(trainings)
      })
    }
  })
})

app.post('/get/training/info', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const TrainingId = req.body.id
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) { 
      const getTrainingExercises = `SELECT * FROM Training_Exercises INNER JOIN Exercises ON Training_Exercises.Exercise_Id = Exercises.Id WHERE Training_Id = ?;`
      connection.query(getTrainingExercises, [TrainingId], (err, exercises) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        const getExercisesBodyParts = `SELECT Body_Parts.Name as Name FROM Exercises_Body_Parts INNER JOIN Body_Parts ON Exercises_Body_Parts = Body_Parts WHERE Exercises_Body_Parts.Exercise_Id = ?;` 
        exercises.forEach(exercise => {
          connection.query(getExercisesBodyParts, [exercise.Id], (err, bodyparts) => {
          if (err) {
            res.status(500).send()
            throw err
            }
            exercise = {...exercise, "Body_Parts":bodyparts.Name}
        })
        });
        res.status(200).send(exercises)
      })
    }
  })
})

app.post('/get/weekly/training', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const StartingDate = req.body.starting_date
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const getUserTrainings = `SELECT * FROM Users_Trainings INNER JOIN Trainings ON Users_Trainings.Training_Id = Trainings.Id WHERE Users_Trainings.User_Id = ? AND Users_Trainings.Date_Start >= ? AND Users_Trainings.Date_End < ?`
      connection.query(getUserTrainings, [users[0].Id, new Date(StartingDate), new Date(new Date(StartingDate).getFullYear(), new Date(StartingDate).getMonth(), new Date(StartingDate).getDate() + 7)], (err, trainings) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        const getExercisesFromTraining = `SELECT * FROM Trainings_Exercises INNER JOIN Exercises ON Trainings_Exercises.Exercise_Id = Exercises.Id WHERE Trainings_Exercises.Training_Id = ?;`
        for (let i = 0; i < trainings.length; i++) {
          connection.query(getExercisesFromTraining, [trainings[i].Id], (err, exercises) => {
            if (err) {
              res.status(500).send()
              throw err
            }
            const getBodyPartsFromTraining = `SELECT * FROM Exercises_Body_Parts INNER JOIN Body_Parts ON Exercises_Body_Parts.Body_Part_Id = Body_Parts.Id WHERE Exercises_Body_Parts.Exercise_Id  = ?`
            for (let j = 0; j < exercises.length; j++) {
              connection.query(getBodyPartsFromTraining, [exercises[j].Id], (err, bodyparts) => {
                if (err) {
                  res.status(500).send()
                  throw err
                }
                exercises[j]={...exercises[j], "BodyParts": bodyparts}
              })
            }
            trainings[i] = {...trainings, "Exercises": exercises}
          })
        }
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