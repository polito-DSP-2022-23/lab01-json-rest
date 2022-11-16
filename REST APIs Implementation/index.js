'use strict';

var path = require('path');
var http = require('http');
var cors = require('cors');
var fs = require('fs');
var oas3Tools = require('oas3-tools');
var { Validator, ValidationError } = require('express-json-validator-middleware');
var serverPort = 3001;

/** Authentication-related imports **/
var passport = require('passport');
var session = require('express-session');


var userController = require(path.join(__dirname, 'controllers/UsersController'));
var filmController = require(path.join(__dirname, 'controllers/FilmsController'));
var reviewController = require(path.join(__dirname, 'controllers/ReviewsController'));

/** Set up and enable Cross-Origin Resource Sharing (CORS) **/


var corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
  };
  
  
/*** Passport ***/
  
// Serializing in the session the user object given from LocalStrategy(verify).
passport.serializeUser(function (user, cb) { // this user is id + username + name 
    cb(null, user);
});
  
// Starting from the data in the session, we extract the current (logged-in) user.
passport.deserializeUser(function (user, cb) { // this user is id + email + name 
    // if needed, we can do extra check here (e.g., double check that the user is still in the database, etc.)
    // e.g.: return userDao.getUserById(id).then(user => cb(null, user)).catch(err => cb(err, null));
    return cb(null, user); // this will be available in req.user
});
  
  
/*** Defining authentication verification middleware ***/
  
const isLoggedIn = (req, res, next) => {
if(req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({error: 'Not authorized'});
}

/*** Defining JSON validator middleware ***/

var filmSchema = JSON.parse(fs.readFileSync(path.join('.', 'json_schemas', 'film_schema.json')).toString());
var userSchema = JSON.parse(fs.readFileSync(path.join('.', 'json_schemas', 'user_schema.json')).toString());
var reviewSchema = JSON.parse(fs.readFileSync(path.join('.', 'json_schemas', 'review_schema.json')).toString());
var validator = new Validator({ allErrors: true });
validator.ajv.addSchema([userSchema, filmSchema, reviewSchema]);
const addFormats = require('ajv-formats').default;
addFormats(validator.ajv);
var validate = validator.validate;


/*** Swagger configuration ***/

var options = {
    routing: {
        controllers: path.join(__dirname, './controllers')
    },
};

var expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, 'api/openapi.yaml'), options);
var app = expressAppConfig.getApp();

// Creating the session

app.use(cors(corsOptions));
app.use(session({
    secret: "shhhhh... it's a secret!",
    resave: false,
    saveUninitialized: false,
  }));
  app.use(passport.authenticate('session'));


//Route methods

app.get('/api/films/public', filmController.getPublicFilms);
app.post('/api/films', isLoggedIn, validate({ body: filmSchema }), filmController.createFilm);
app.get('/api/films/private/:filmId', isLoggedIn, filmController.getSinglePrivateFilm);
app.put('/api/films/private/:filmId', isLoggedIn, validate({ body: filmSchema }), filmController.updateSinglePrivateFilm);
app.delete('/api/films/private/:filmId', isLoggedIn, filmController.deleteSinglePrivateFilm);
app.get('/api/films/public/invited', isLoggedIn, filmController.getInvitedFilms);
app.get('/api/films/public/:filmId', filmController.getSinglePublicFilm);
app.put('/api/films/public/:filmId', isLoggedIn, validate({ body: filmSchema }), filmController.updateSinglePublicFilm);
app.delete('/api/films/public/:filmId', isLoggedIn, filmController.deleteSinglePublicFilm);
app.get('/api/films/public/:filmId/reviews', reviewController.getFilmReviews);
app.post('/api/films/public/:filmId/reviews', isLoggedIn, reviewController.issueFilmReview);
app.get('/api/films/public/:filmId/reviews/:reviewerId', reviewController.getSingleReview);
app.put('/api/films/public/:filmId/reviews/:reviewerId', isLoggedIn, reviewController.updateSingleReview);
app.delete('/api/films/public/:filmId/reviews/:reviewerId', isLoggedIn, reviewController.deleteSingleReview);
app.get('/api/users', isLoggedIn, userController.getUsers);
app.post('/api/users/authenticator', userController.authenticateUser);
app.get('/api/users/:userId', isLoggedIn, userController.getSingleUser);
app.get('/api/films/private', isLoggedIn, filmController.getPrivateFilms);

// Error handlers for validation and authentication errors

app.use(function(err, req, res, next) {
    if (err instanceof ValidationError) {
        res.status(400).send(err);
    } else next(err);
});

app.use(function(err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        var authErrorObj = { errors: [{ 'param': 'Server', 'msg': 'Authorization error' }] };
        res.status(401).json(authErrorObj);
    } else next(err);
});


// Initialize the Swagger middleware

http.createServer(app).listen(serverPort, function() {
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
});