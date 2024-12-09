const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session'); 
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(__dirname));

// session 
app.use(
  session({
    secret: 'secrete', 
    resave: false, 
    saveUninitialized: false, 
    cookie: { secure: false }, 
  })
);

// Database connection
const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123123',
  database: 'mfb',
});

con.connect((err) => {
  if (err) {
    console.error('Error connecting to database');
  } else {
    console.log('Connected to database');
  }
  });

//  server port
app.listen(8080, () => {
  console.log('Server running on 8080');
});

// Home route
app.get('/', (req, res) => {
 
    res.sendFile(__dirname + '/home.html');

});

// Fetch all books
app.get('/books', (req, res) => {
  con.query('SELECT * FROM Books', (err, results) => {
    if (err) {
      console.error('Failed to fetch books'); 
      res.json({ error: 'Failed to fetch books' });
    } else {
      res.json(results); 
    }
  });
});

// Fetch top 7 best seller books
app.get('/best-sellers', (req, res) => {
  const bestSellers = `SELECT * FROM Books ORDER BY sales_count DESC LIMIT 7`;

  con.query(bestSellers, (err, results) => {
    if (err) {
      console.error('Failed to fetch best-selling books:', err);
      res.status(500).json({ error: 'Failed to fetch best-selling books' });
    } else {
      res.json(results); 
    }
  });
});



// register

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/register.html');
});


app.post('/register', (req, res) => {
   const { first_name, last_name, email, password, phone_number, university, college, section } = req.body;

  const insertreg = `INSERT INTO Customers (first_name, last_name, email, password, phone_number, university, college, section) 
               VALUES ('${first_name}', '${last_name}', '${email}', '${password}', '${phone_number}', '${university}', '${college}', '${section}')`;


  con.query(insertreg, (err) => {
    if (err) {
      console.error('REGISTER ERROR'); 
      res.send(`<script>alert('Registration failed');</script>`);
    } else {
      res.send(`<script>alert('Registration successful');window.location.href = '/login';</script>`);

      }
    });
    });


//login
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});


app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const checkCarden = `SELECT * FROM Customers WHERE email = '${email}' AND password = '${password}'`;

  con.query(checkCarden, (err, results) => {
    if (err) {
      console.error('Error during login:', err); 
      return; 
    }

    if (results.length > 0) {
      req.session.customerId = results[0].customer_id; 
      res.send(`<script> alert('Login successful'); window.location.href = '/home.html'; </script>`);
 
    } else {
      res.send(`<script>alert('Invalid email or password'); window.location.href = '/login';</script>`);
       
     }
     });
   });

// logout
app.get('/logout', (req, res) => {
  req.session.destroy()
})



// place order
app.post('/place-order', (req, res) => {
  const { address, booksInCart } = req.body;

  if (!req.session.customerId) {
    return res.status(401).json({ error: 'You must log in to place an order' });
  }

  const customerId = req.session.customerId;
  const status = 'Pending';

  
  let totalAmount = 0;
  booksInCart.forEach((item) => {
    totalAmount += item.price * item.quantity;
  });

  
  const insertOrder = `INSERT INTO Orders (customer_id, order_date, total_amount, status, address) 
                       VALUES (${customerId}, NOW(), ${totalAmount}, '${status}', '${address}')`;

  con.query(insertOrder, (err, orderResult) => {
    if (err) {
      console.error('Error inserting order'); 
      return res.send('Failed to place order');
    }

    const orderId = orderResult.insertId; 

    
    booksInCart.forEach((item) => {
      const { bookId, quantity, price } = item;

      
      const insertOrderItems = `INSERT INTO Order_items (order_id, book_id, quantity, price) 
                                VALUES (${orderId}, ${bookId}, ${quantity}, ${price})`;

      con.query(insertOrderItems, (err) => {
        if (err) {
          console.error(`Error inserting order items`); 
          return; 
        }

        
        const updateBooks = `UPDATE Books SET quantity = quantity - ${quantity} WHERE book_id = ${bookId}`;
        con.query(updateBooks, (err) => {
          if (err) {
            console.error(`Error updating stock for books`); 
          }
        });
      });
    });

    res.send('Order placed successfully');
  });
});


