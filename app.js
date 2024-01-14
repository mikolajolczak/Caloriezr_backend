const express = require('express');
const mysql = require('mysql');
const fs = require('fs');
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
//new
app.get('/get/user', (req, res) => {
  const Password = req.query.password;
  const Email = req.query.email;
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password,Email], (err, rows) => {
    if (err) throw err
    if (rows.length > 0) {
      res.status(200).send({ok:1})
    }
    else {
      res.status(400).send()
    }
  })
})

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

app.post('/change/meal/limit', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const carbonLimit = req.body.carbon_limit
  const caloriesLimit = req.body.calories_limit
  const proteinsLimit = req.body.proteins_limit
  const fatsLimit = req.body.fats_limit
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, rows) => { 
    if (err) {
      res.status(500).send()
      throw err
    }
    if (rows.length > 0) {
      const updateStepLimitQuery = `Update Users SET Calories_Limit=?,Carbs_Limit=?,Proteins_Limit=?,Fats_Limit=? WHERE Id = ?`
      connection.query(updateStepLimitQuery, [caloriesLimit,carbonLimit,proteinsLimit,fatsLimit, rows[0].Id], (err, rows) => {
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
  const CarbsLimit = req.body.carbs_limit
  const CaloriesLimit = req.body.calories_limit
  const ProteinsLimit = req.body.proteins_limit
  const FatsLimit = req.body.fats_limit
  const StepLimit = req.body.step_limit
  const WaterLimit = req.body.water_limit
  const addUserQuery = `INSERT INTO Users(Name, Password, Email, Water_Limit, Step_Limit, Calories_Limit, Carbs_Limit, Proteins_Limit, Fats_Limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  connection.query(addUserQuery, [Name, Password, Email, WaterLimit, StepLimit, CaloriesLimit,CarbsLimit,ProteinsLimit,FatsLimit], (err, rows) => {
    if (err) {
      res.status(500).send()
      throw err
    };
    res.status(200).send({ok:1})
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
      const getFavouriteProducts = `SELECT Product_Id, Score, Size, Unit, Barcode, Group_Name, Name, Calories FROM Favourite_Products INNER JOIN Products ON Favourite_Products.Product_Id = Products.Id INNER JOIN Product_Groups ON Products.Group_Id = Product_Groups.Id WHERE Favourite_Products.User_Id = ? ORDER BY Products.Id`
      connection.query(getFavouriteProducts, [rows[0].Id], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        if (rows.length > 0) {
            res.status(200).send(rows)
        }
        else {
          res.status(200).send([])
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
      const getRecentProducts = `SELECT Product_Id, Score, Size, Unit, Barcode, Group_Name, Name, Calories FROM Recent_Searched INNER JOIN Products ON Recent_Searched.Product_Id = Products.Id INNER JOIN Product_Groups ON Products.Group_Id = Product_Groups.Id WHERE Recent_Searched.User_Id = ? ORDER BY Products.Id`
      connection.query(getRecentProducts, [rows[0].Id], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        if (rows.length > 0) {
            res.status(200).send(rows)
        }
        else {
          res.status(200).send([])
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
      res.status(403).send([])
      throw err
    }
    if (users.length > 0) {
      const getProductById = `SELECT * FROM Products WHERE Id = ?`
      connection.query(getProductById, [Product_Id], (err, products) => {
        if (err) {
          res.status(403).send([])
          throw err
        }
        if (products.length == 1) {
          const searchProductAndUser = `SELECT COUNT(*) as Sum FROM Recent_Searched WHERE User_Id = ? AND Product_Id = ?`
          const addProductToRecent = `INSERT INTO Recent_Searched(Product_Id, User_Id, Date_Add) VALUES (?,?, NOW())`
          connection.query(searchProductAndUser, [users[0].Id, products[0].Id], (err, rows) => {
            if (err) {
              res.status(403).send([])
              throw err
            }
            if (rows[0].Sum < 1) {
              connection.query(addProductToRecent, [products[0].Id,users[0].Id], (err, rows) => {
                if (err) {
                  res.status(403).send([])
                  throw err
                }
              })
            }
          })
          const getProductIngredients = `SELECT * FROM Products_Ingredients INNER JOIN Ingredients ON Products_Ingredients.Ingredient_Id = Ingredients.Id INNER JOIN Ingredient_Types ON Ingredient_Types.Id = Ingredients.Type_Id WHERE Products_Ingredients.Product_Id = ? ORDER BY Products_Ingredients.Product_Id`
          connection.query(getProductIngredients, [products[0].Id], (err, ingredients) => {
            if (err) {
              res.status(500).send([])
              throw err
            }
            products[0] = { ...products[0], "Ingredients": ingredients }
            const getProductMacros = `SELECT * FROM Macros_Products INNER JOIN Macros ON Macros_Products.Macros_Id = Macros.Id INNER JOIN Macro_Groups ON Macros.Group_Id = Macro_Groups.Id WHERE Macros_Products.Products_Id = ?`
            connection.query(getProductMacros, [products[0].Id], (err, macros) => {
              if (err) {
                res.status(500).send([])
                throw err
              }
              products[0] = { ...products[0], "Macros": macros }
              const getFavouriteQuery = `SELECT * FROM Favourite_Products WHERE Product_Id = ? AND User_Id = ?`
              connection.query(getFavouriteQuery, [products[0].Id, users[0].Id], (err, rows) => {
                if (err) {
                  res.status(500).send([])
                  throw err
                }
                if (rows.length > 0) {
                  products[0] = {...products[0], "isFavourite": true}
                } else {
                  products[0] = {...products[0], "isFavourite": false}
                }
                res.status(200).send(products[0])
              })
            })
          })
          
        } else {
          res.status(403).send([])
        }
      })
      
    } else {
      res.status(403).send([])
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
      const getProductByBarcodeQuery = `SELECT Products.Id, Score, Size, Unit, Barcode, Group_Name, Name, Calories FROM Products INNER JOIN Product_Groups ON Products.Group_Id = Product_Groups.Id WHERE Name LIKE ? LIMIT 5`
      connection.query(getProductByBarcodeQuery, ['%' + Name + '%'], (err, products) => {
        if (err) {
          res.status(500).send()
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
      res.status(403).send([])
      throw err
    }
    if (users.length > 0) {
      const getProductByBarcodeQuery = `SELECT * FROM Products WHERE Barcode = ?`
      connection.query(getProductByBarcodeQuery, [Barcode], (err, products) => {
        if (err) {
          res.status(403).send([])
          throw err
        }
        if (products.length > 0) {
          res.status(200).send(products[0])
        }
        else {
          res.status(404).send([])
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
          const addProductToRecent = `INSERT INTO Favourite_Products(Product_Id, User_Id, Date_Add) VALUES (?,?, NOW())`
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
  const Description = req.body.description
  const Preparation_Time = req.body.prep_time
  const Image = fs.readFileSync('img/img1.png').toString('hex')
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(500).send()
      throw err
    }
    if (users.length > 0) {
      const addMealQuery = `INSERT INTO Meals(Meal_Name, Preparation_Time, Image) VALUES (?,?, x\'${Image}\')`
      connection.query(addMealQuery, [MealName, Preparation_Time,Image], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        const getMealId = `SELECT * FROM Meals WHERE Meal_Name = ?`
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
              const addMealToUser = 'INSERT INTO Meal_Users(Meal_Id, User_Id, Date, Description, isDone) VALUES (?,?,?,?,?)'
              connection.query(addMealToUser, [meal[0].Id, users[0].Id, new Date(MealDate),Description, false], (err, rows) => {
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

app.post('/del/product/meal', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const Product_Id = req.body.product_id
  const Meal_Id = req.body.meal_id
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send([])
      throw err
    }
    if (users.length > 0) {
      const getMealsByNameQuery = `DELETE FROM Products_Meals WHERE Product_Id = ? AND Meal_Id = ?`
      connection.query(getMealsByNameQuery, [Product_Id,Meal_Id], (err, meals) => {
        if (err) {
          res.status(500).send([])
          throw err
        }
        res.status(200).send([])
      })
    }
  })
}) // get meal names TOP5

app.post('/add/product/meal', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const Product_Id = req.body.product_id
  const Meal_Id = req.body.meal_id
  const Quantity = req.body.quantity
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send([])
      throw err
    }
    if (users.length > 0) {
      const getMealsByNameQuery = `INSERT INTO Products_Meals(Product_Id, Meal_Id, Quantity) VALUES (?,?,?)`
      connection.query(getMealsByNameQuery, [Product_Id,Meal_Id, Quantity], (err, meals) => {
        if (err) {
          res.status(500).send([])
          throw err
        }
        res.status(200).send([])
      })
    }
  })
}) // get meal names TOP5

app.post('/del/meal', (req, res) => {
  const Password = req.body.password;
  const Email = req.body.email;
  const Meal_Id = req.body.id
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const delMealQuery = `DELETE FROM Meal_Users WHERE Meal_Id=? AND User_Id = ?;`
      connection.query(delMealQuery, [users[0].Id, Meal_Id], (err, rows) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send([])
      })
    }
  })
})

const getProductsFromMeal = async (password, email, startingdate) => {
  const getProductsQuery = `SELECT Product_Id, Score, Size, Unit, Barcode, Group_Id, Name, Calories, Fats, Carbons, Proteins, Quantity FROM Products_Meals INNER JOIN Products ON Products_Meals.Product_Id = Products.Id WHERE Products_Meals.Meal_Id = ?`
  try {
    const data = await getMealsFromUser(password, email, startingdate)
    for (let meal of data.meals) {
      const products = async (meal) => {
        return new Promise((resolve, reject) => {
          connection.query(getProductsQuery, [meal.Id], function (error, results) {
            if (error) reject(error)
            let calories = 0
            let proteins = 0
            let carbs = 0
            let fats = 0
            results.forEach(product => {
              calories += product.Calories * product.Quantity;
              carbs += product.Carbons * product.Quantity;
              proteins += product.Proteins * product.Quantity;
              fats += product.Fats * product.Quantity;
            });
            meal.products = results
            meal.calories = calories
            meal.proteins = proteins
            meal.carbs = carbs
            meal.fats = fats
            resolve(meal)
          })
        })
      }
      await products(meal)
    }
    return data;
  } catch (error) {
    console.error(error)
    throw error
  }
}

const getUser = async (password, email) => {
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  return new Promise((resolve, reject) => {
    connection.query(getUserQuery, [password, email], (err, users) => { 
      if (err)
        reject(err)
      resolve(users[0])
    })
  })
}

const getMealsFromUser = async (password, email, startingdate) => {
  const getMealsQuery = `SELECT * FROM Meal_Users INNER JOIN Meals ON Meal_Users.Meal_Id = Meals.Id WHERE User_Id = ? AND Meal_Users.Date >= ? Meal_Users.Date <= ?`
  try {
    const user = await getUser(password, email)
    return new Promise((resolve, reject) => {
      connection.query(getMealsQuery, [user.Id, new Date(startingdate), new Date(new Date(startingdate).getFullYear(), new Date(startingdate).getMonth(), new Date(startingdate).getDate() + 7)], (err, meals) => { 
        if (err)
          reject(err)
        resolve({calories_limit: user.Calories_Limit, carbs_limit: user.Carbs_Limit, proteins_limit: user.Proteins_Limit,fats_limit: user.Fats_Limit, meals: meals})
      })
    })
  } catch (error) {
    console.error(error)
    throw error
  }
}

app.post('/get/weekly/meals', async (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const StartingDate = req.body.date
  try {
    const dataToSend = await getProductsFromMeal(Password, Email, StartingDate);
    res.status(200).send(dataToSend)
  } catch (error) {
    res.status(500).send()
    console.error(error)
  }
  
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
          const updateWaterState = `UPDATE Water_Users SET  Drunk_Water = Drunk_Water + 200 WHERE Id = ?`
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

app.post('/get/exercise/name', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const name = req.body.name
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const setNewWaterLimit = `SELECT * FROM Exercises WHERE Name LIKE ? LIMIT 5`
      connection.query(setNewWaterLimit, ['%' + name + '%'], (err, exercises) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send(exercises)
       })
    }
  })
})

app.post('/del/training', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const TrainingId = req.body.training_id
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const setNewWaterLimit = `DELETE FROM Users_Trainings WHERE Training_Id = ? AND User_Id = ?`
      connection.query(setNewWaterLimit, [TrainingId, users[0].Id], (err, exercises) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        res.status(200).send()
       })
    }
  })
})

app.post('/del/exercise/training', (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const TrainingId = req.body.training_id
  const ExerciseId = req.body.exercise_id
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) {
      const setNewWaterLimit = `DELETE FROM Trainings_Exercises WHERE Training_Id = ? AND Exercise_Id = ?`
      connection.query(setNewWaterLimit, [TrainingId, ExerciseId], (err, exercises) => {
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
  const EndDate = req.body.end_date
  const Exercises = req.body.exercises
  const Description = req.body.description
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], (err, users) => {
    if (err) {
    res.status(403).send()
    throw err
    }
    if (users.length > 0) {
      const Image = fs.readFileSync('img/img1.png').toString('hex')
      const insertNewTraining = `INSERT INTO Trainings(Name, Image) VALUES (?,  x\'${Image}\')`
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
          const connectTrainingToUser = `INSERT INTO Users_Trainings(User_Id, Training_Id, Date_Start, Date_End, IsDone, Description) VALUES (?,?,?,?,?,?)`
          connection.query(connectTrainingToUser, [users[0].Id, trainings[0].Id, new Date(StartDate), new Date(EndDate), false, Description], (err, rows) => {
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
  const trainingName = req.body.name
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

const getBodyParts = async (exercise) => {
  const getExercisesBodyParts = `SELECT Body_Parts.Name as Name FROM Exercises_Body_Parts INNER JOIN Body_Parts ON Exercises_Body_Parts.Body_Part_Id = Body_Parts.Id WHERE Exercises_Body_Parts.Exercise_Id = ?;`
          
  return new Promise((resolve,reject)=>{connection.query(getExercisesBodyParts, [exercise.Id], (err, bodyparts) => {
    if (err) {
      reject(err)
      }
      resolve(bodyparts)
  })})
}

app.post('/get/training/info', async (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const TrainingId = req.body.id
  const getUserQuery = `SELECT * FROM Users WHERE Password = ? AND Email = ?`
  connection.query(getUserQuery, [Password, Email], async (err, users) => {
    if (err) {
      res.status(403).send()
      throw err
    }
    if (users.length > 0) { 
      const getTrainingExercises = `SELECT * FROM Trainings_Exercises INNER JOIN Exercises ON Trainings_Exercises.Exercise_Id = Exercises.Id WHERE Training_Id = ?;`
      connection.query(getTrainingExercises, [TrainingId], async (err, exercises) => {
        if (err) {
          res.status(500).send()
          throw err
        }
        const exercisesToSend = []
        for (const exercise of exercises) {
          const bodyParts = await getBodyParts(exercise)
          exercisesToSend.push({...exercise, "Body_Parts": bodyParts})
        }
        res.status(200).send(exercisesToSend)
      })
    }
  })
})

const getTrainingsFromUser = async (password, email, startingdate) => {
  const getUserTrainings = `SELECT * FROM Users_Trainings INNER JOIN Trainings ON Users_Trainings.Training_Id = Trainings.Id WHERE Users_Trainings.User_Id = ? AND Users_Trainings.Date_Start >= ? AND Users_Trainings.Date_End <= ?`
  try {
    const user = await getUser(password, email)
    return new Promise((resolve, reject) => {
      connection.query(getUserTrainings, [user.Id, new Date(startingdate), new Date(new Date(startingdate).getFullYear(), new Date(startingdate).getMonth(), new Date(startingdate).getDate() + 7)], (err, trainings) => {
        if (err)
          reject(err)
        resolve(trainings)
      })
    })
  } catch (error) {
    console.error(error)
    throw error
  }
}

const getExercisesFromTrainings = async (password, email, startingdate) => {
  const getExercisesFromTrainingQuery = `SELECT * FROM Trainings_Exercises INNER JOIN Exercises ON Trainings_Exercises.Exercise_Id = Exercises.Id WHERE Trainings_Exercises.Training_Id = ?;`
  try {
    const trainings = await getTrainingsFromUser(password, email, startingdate)
    for (const training of trainings) {
      const exercises = async (training) => {
        return new Promise((resolve, reject) => {
          connection.query(getExercisesFromTrainingQuery, [training.Id], (err, exercises) => {
            if (err) reject(err)
            training.exercises = exercises
            resolve(training)
           })
        })
      }
      await exercises(training)
    }
    return trainings
  } catch (error) {
    console.error(error)
    throw error
  }
}

app.post('/get/weekly/training', async (req, res) => {
  const Password = req.body.password
  const Email = req.body.email
  const StartingDate = req.body.starting_date
  try {
    const dataToSend = await getExercisesFromTrainings(Password, Email, StartingDate);
    res.status(200).send(dataToSend)
  } catch (error) {
    res.status(500).send()
    console.error(error)
  }
})

const PORT = parseInt(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;