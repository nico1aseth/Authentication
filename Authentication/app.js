require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: 'Our little secret.',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/cafeuserDB');

const cafeuserSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String
});

cafeuserSchema.plugin(passportLocalMongoose);
cafeuserSchema.plugin(findOrCreate);

const Cafeuser = new mongoose.model('Cafeuser', cafeuserSchema);

passport.use(Cafeuser.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Cafeuser.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/success",
    passReqToCallback: true
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);

    Cafeuser.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,
    callbackURL: "http://localhost:3000/auth/facebook/success"
  },
  function(accessToken, refreshToken, profile, cb) {
    Cafeuser.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/', (req, res) => {
  res.send('Home Page');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

app.get('/auth/google/success',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  (req, res) => res.redirect('/success')
);

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/success',
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/success')
  });

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/success', (req, res) => {
  if (req.isAuthenticated()) {
    res.send('Successfully Login In!');
  } else res.redirect('/login');
});

app.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) return next(err);
    res.redirect('/');
  });
});

app.post('/register', (req, res) => {
  Cafeuser.register({ username: req.body.username}, req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect('/register');
    } else {
      passport.authenticate('local')(req, res, () => {
        res.redirect('/success');
      });
    }
  });
});

app.post('/login', (req, res) => {
  const user = new Cafeuser({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, err => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, () => {
        res.redirect('/success');
      });
    }
  });
});


app.listen(3000, () => {
  console.log('Server started on port 3000');
});
